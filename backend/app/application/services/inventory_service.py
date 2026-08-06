from __future__ import annotations
import uuid
from typing import Optional, Tuple

from app.application.schemas.inventory import InventoryAdjustRequest
from app.core.exceptions import BadRequestError, NotFoundError
from app.domain.entities.inventory import Inventory, InventoryMovement
from app.domain.repositories.inventory_repository import InventoryRepository
from app.shared.utils.helpers import sanitize_text, utc_now


class InventoryService:
    def __init__(self, inventory_repo: InventoryRepository) -> None:
        self.inventory_repo = inventory_repo

    def list(
        self,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        warehouse: Optional[str] = None,
        low_stock: Optional[bool] = None,
    ) -> Tuple[list[Inventory], int]:
        return self.inventory_repo.list(
            page=page, page_size=page_size, search=search, warehouse=warehouse, low_stock=low_stock
        )

    def get(self, inventory_id: uuid.UUID) -> Inventory:
        inventory = self.inventory_repo.get_by_id(inventory_id)
        if inventory is None:
            raise NotFoundError("Inventory record not found.")
        return inventory

    def get_by_product(self, product_id: uuid.UUID) -> Inventory:
        inventory = self.inventory_repo.get_by_product(product_id)
        if inventory is None:
            raise NotFoundError("Inventory record not found for this product.")
        return inventory

    def adjust(self, product_id: uuid.UUID, data: InventoryAdjustRequest) -> Inventory:
        inventory = self.get_by_product(product_id)
        if data.movement_type in ("shipped", "reserved") and inventory.available_quantity < data.delta:
            raise BadRequestError("Insufficient available stock for this movement.")
        reference = sanitize_text(data.reference) if data.reference else None
        note = sanitize_text(data.note) if data.note else None
        return self.inventory_repo.adjust_quantity(
            product_id,
            data.delta,
            reference=reference,
            note=note,
            movement_type=data.movement_type.value,
        )

    def movements(
        self,
        page: int,
        page_size: int,
        product_id: Optional[uuid.UUID] = None,
        movement_type: Optional[str] = None,
    ) -> Tuple[list[InventoryMovement], int]:
        return self.inventory_repo.list_movements(
            page=page, page_size=page_size, product_id=product_id, movement_type=movement_type
        )

    def low_stock(self, limit: int = 50) -> list[Inventory]:
        return self.inventory_repo.low_stock_items(limit=limit)
