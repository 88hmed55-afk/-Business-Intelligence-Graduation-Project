from __future__ import annotations
import uuid
from typing import List, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.domain.entities.inventory import Inventory, InventoryMovement
from app.domain.repositories.inventory_repository import InventoryRepository
from app.infrastructure.models.inventory import Inventory as InventoryModel
from app.infrastructure.models.inventory import InventoryMovement as InventoryMovementModel
from app.infrastructure.models.product import Product as ProductModel


class SQLAlchemyInventoryRepository(InventoryRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_domain(self, model: Optional[InventoryModel]) -> Optional[Inventory]:
        if model is None:
            return None
        return Inventory(
            id=model.id,
            product_id=model.product_id,
            quantity=model.quantity,
            reserved_quantity=model.reserved_quantity,
            warehouse=model.warehouse,
            location=model.location,
            last_restocked_at=model.last_restocked_at,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _movement_to_domain(self, model: Optional[InventoryMovementModel]) -> Optional[InventoryMovement]:
        if model is None:
            return None
        return InventoryMovement(
            id=model.id,
            inventory_id=model.inventory_id,
            product_id=model.product_id,
            movement_type=model.movement_type,
            quantity_change=model.quantity_change,
            moved_at=model.moved_at,
            reference=model.reference,
            note=model.note,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def get_by_id(self, inventory_id: uuid.UUID) -> Optional[Inventory]:
        return self._to_domain(self.db.get(InventoryModel, inventory_id))

    def get_by_product(self, product_id: uuid.UUID) -> Optional[Inventory]:
        stmt = select(InventoryModel).where(InventoryModel.product_id == product_id)
        return self._to_domain(self.db.scalar(stmt))

    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        warehouse: Optional[str] = None,
        low_stock: Optional[bool] = None,
    ) -> Tuple[list[Inventory], int]:
        stmt = (
            select(InventoryModel)
            .join(ProductModel, ProductModel.id == InventoryModel.product_id)
            .where(ProductModel.is_deleted.is_(False))
        )
        if warehouse:
            stmt = stmt.where(InventoryModel.warehouse == warehouse)
        if low_stock is True:
            stmt = stmt.where(InventoryModel.quantity <= ProductModel.reorder_level)
        if search:
            like = f"%{search.strip()}%"
            stmt = stmt.where(ProductModel.name.ilike(like))
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(ProductModel.name.asc()).offset((page - 1) * page_size).limit(page_size)
        ).all()
        return [self._to_domain(r) for r in rows if r], total

    def create(self, entity: Inventory) -> Inventory:
        model = InventoryModel(
            id=entity.id,
            product_id=entity.product_id,
            quantity=entity.quantity,
            reserved_quantity=entity.reserved_quantity,
            warehouse=entity.warehouse,
            location=entity.location,
            last_restocked_at=entity.last_restocked_at,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def update(self, entity: Inventory) -> Inventory:
        model = self.db.get(InventoryModel, entity.id)
        if model is None:
            raise NotFoundError("Inventory record not found.")
        model.quantity = entity.quantity
        model.reserved_quantity = entity.reserved_quantity
        model.warehouse = entity.warehouse
        model.location = entity.location
        model.last_restocked_at = entity.last_restocked_at
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def adjust_quantity(
        self,
        product_id: uuid.UUID,
        delta: object,
        *,
        reference: Optional[str] = None,
        note: Optional[str] = None,
        movement_type: str = "adjusted",
    ) -> Inventory:
        model = self.db.scalar(select(InventoryModel).where(InventoryModel.product_id == product_id))
        if model is None:
            raise NotFoundError("Inventory record not found for this product.")
        model.quantity = (model.quantity or 0) + delta
        if movement_type == "received":
            model.last_restocked_at = func.now()
        movement = InventoryMovementModel(
            id=uuid.uuid4(),
            inventory_id=model.id,
            product_id=product_id,
            movement_type=movement_type,
            quantity_change=delta,
            moved_at=func.now(),
            reference=reference,
            note=note,
        )
        self.db.add(movement)
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or Inventory(
            id=model.id, product_id=product_id, quantity=model.quantity
        )

    def list_movements(
        self,
        *,
        page: int,
        page_size: int,
        product_id: Optional[uuid.UUID] = None,
        movement_type: Optional[str] = None,
    ) -> Tuple[list[InventoryMovement], int]:
        stmt = select(InventoryMovementModel)
        if product_id is not None:
            stmt = stmt.where(InventoryMovementModel.product_id == product_id)
        if movement_type:
            stmt = stmt.where(InventoryMovementModel.movement_type == movement_type)
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(InventoryMovementModel.moved_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return [self._movement_to_domain(r) for r in rows if r], total

    def count(self) -> int:
        return (
            self.db.scalar(
                select(func.count())
                .select_from(InventoryModel)
                .join(ProductModel, ProductModel.id == InventoryModel.product_id)
                .where(ProductModel.is_deleted.is_(False))
            )
            or 0
        )

    def low_stock_items(self, limit: int) -> List[Inventory]:
        rows = self.db.scalars(
            select(InventoryModel)
            .join(ProductModel, ProductModel.id == InventoryModel.product_id)
            .where(ProductModel.is_deleted.is_(False), InventoryModel.quantity <= ProductModel.reorder_level)
            .order_by(InventoryModel.quantity.asc())
            .limit(limit)
        ).all()
        return [self._to_domain(r) for r in rows if r]
