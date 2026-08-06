from __future__ import annotations
import uuid
from typing import Dict, List, Optional, Tuple

from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.domain.entities.product import Product
from app.domain.repositories.product_repository import ProductRepository
from app.infrastructure.models.product import Product as ProductModel


class SQLAlchemyProductRepository(ProductRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_domain(self, model: Optional[ProductModel]) -> Optional[Product]:
        if model is None:
            return None
        return Product(
            id=model.id,
            name=model.name,
            sku=model.sku,
            unit_price=model.unit_price,
            cost_price=model.cost_price,
            barcode=model.barcode,
            description=model.description,
            category_id=model.category_id,
            supplier_id=model.supplier_id,
            reorder_level=model.reorder_level,
            weight_kg=model.weight_kg,
            is_active=model.is_active,
            is_deleted=model.is_deleted,
            deleted_at=model.deleted_at,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def get_by_id(self, product_id: uuid.UUID) -> Optional[Product]:
        return self._to_domain(self.db.get(ProductModel, product_id))

    def get_by_sku(self, sku: str) -> Optional[Product]:
        stmt = select(ProductModel).where(ProductModel.sku == sku)
        return self._to_domain(self.db.scalar(stmt))

    def get_many(self, product_ids: List[uuid.UUID]) -> Dict[uuid.UUID, Product]:
        if not product_ids:
            return {}
        rows = self.db.scalars(select(ProductModel).where(ProductModel.id.in_(product_ids))).all()
        return {r.id: self._to_domain(r) for r in rows if r is not None and r.id is not None}

    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        category_id: Optional[uuid.UUID] = None,
        supplier_id: Optional[uuid.UUID] = None,
        is_active: Optional[bool] = None,
        min_price: Optional[object] = None,
        max_price: Optional[object] = None,
        include_deleted: bool = False,
    ) -> Tuple[list[Product], int]:
        stmt = select(ProductModel)
        if not include_deleted:
            stmt = stmt.where(ProductModel.is_deleted.is_(False))
        if category_id is not None:
            stmt = stmt.where(ProductModel.category_id == category_id)
        if supplier_id is not None:
            stmt = stmt.where(ProductModel.supplier_id == supplier_id)
        if is_active is not None:
            stmt = stmt.where(ProductModel.is_active.is_(is_active))
        if min_price is not None:
            stmt = stmt.where(ProductModel.unit_price >= min_price)
        if max_price is not None:
            stmt = stmt.where(ProductModel.unit_price <= max_price)
        if search:
            like = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    ProductModel.name.ilike(like),
                    ProductModel.sku.ilike(like),
                    ProductModel.barcode.ilike(like),
                )
            )
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(ProductModel.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return [self._to_domain(r) for r in rows if r], total

    def create(self, entity: Product) -> Product:
        model = ProductModel(
            id=entity.id,
            name=entity.name,
            sku=entity.sku,
            unit_price=entity.unit_price,
            cost_price=entity.cost_price,
            barcode=entity.barcode,
            description=entity.description,
            category_id=entity.category_id,
            supplier_id=entity.supplier_id,
            reorder_level=entity.reorder_level,
            weight_kg=entity.weight_kg,
            is_active=entity.is_active,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def update(self, entity: Product) -> Product:
        model = self.db.get(ProductModel, entity.id)
        if model is None:
            raise NotFoundError("Product not found.")
        model.name = entity.name
        model.sku = entity.sku
        model.unit_price = entity.unit_price
        model.cost_price = entity.cost_price
        model.barcode = entity.barcode
        model.description = entity.description
        model.category_id = entity.category_id
        model.supplier_id = entity.supplier_id
        model.reorder_level = entity.reorder_level
        model.weight_kg = entity.weight_kg
        model.is_active = entity.is_active
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def soft_delete(self, entity: Product) -> Product:
        model = self.db.get(ProductModel, entity.id)
        if model is None:
            raise NotFoundError("Product not found.")
        model.is_deleted = True
        model.deleted_at = entity.deleted_at
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def count(self) -> int:
        return (
            self.db.scalar(
                select(func.count())
                .select_from(ProductModel)
                .where(ProductModel.is_deleted.is_(False))
            )
            or 0
        )

    def top_sellers(self, limit: int) -> list:
        rows = self.db.execute(
            text(
                """
                SELECT p.id AS product_id, p.name AS product_name, p.sku,
                       SUM(oi.quantity) AS units_sold, SUM(oi.line_total) AS revenue
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id AND o.is_deleted = false
                JOIN products p ON p.id = oi.product_id
                WHERE o.status <> 'cancelled'
                GROUP BY p.id, p.name, p.sku
                ORDER BY revenue DESC
                LIMIT :limit
                """
            ),
            {"limit": limit},
        ).all()
        return [
            {
                "product_id": r.product_id,
                "product_name": r.product_name,
                "sku": r.sku,
                "units_sold": float(r.units_sold or 0),
                "revenue": float(r.revenue or 0),
            }
            for r in rows
        ]
