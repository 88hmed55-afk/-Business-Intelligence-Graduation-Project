from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple

from app.domain.entities.inventory import Inventory, InventoryMovement


class InventoryRepository(ABC):
    """Contract for inventory persistence."""

    @abstractmethod
    def get_by_id(self, inventory_id: uuid.UUID) -> Optional[Inventory]: ...

    @abstractmethod
    def get_by_product(self, product_id: uuid.UUID) -> Optional[Inventory]: ...

    @abstractmethod
    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        warehouse: Optional[str] = None,
        low_stock: Optional[bool] = None,
    ) -> Tuple[list[Inventory], int]: ...

    @abstractmethod
    def create(self, entity: Inventory) -> Inventory: ...

    @abstractmethod
    def update(self, entity: Inventory) -> Inventory: ...

    @abstractmethod
    def adjust_quantity(self, product_id: uuid.UUID, delta: object, *, reference: Optional[str] = None, note: Optional[str] = None, movement_type: str = "adjusted") -> Inventory: ...

    @abstractmethod
    def list_movements(
        self,
        *,
        page: int,
        page_size: int,
        product_id: Optional[uuid.UUID] = None,
        movement_type: Optional[str] = None,
    ) -> Tuple[list[InventoryMovement], int]: ...

    @abstractmethod
    def count(self) -> int: ...

    @abstractmethod
    def low_stock_items(self, limit: int) -> List[Inventory]: ...
