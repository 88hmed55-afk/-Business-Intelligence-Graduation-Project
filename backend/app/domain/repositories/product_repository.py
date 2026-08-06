from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Tuple

from app.domain.entities.product import Product


class ProductRepository(ABC):
    """Contract for product persistence."""

    @abstractmethod
    def get_by_id(self, product_id: uuid.UUID) -> Optional[Product]: ...

    @abstractmethod
    def get_by_sku(self, sku: str) -> Optional[Product]: ...

    @abstractmethod
    def get_many(self, product_ids: List[uuid.UUID]) -> Dict[uuid.UUID, Product]: ...

    @abstractmethod
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
    ) -> Tuple[list[Product], int]: ...

    @abstractmethod
    def create(self, entity: Product) -> Product: ...

    @abstractmethod
    def update(self, entity: Product) -> Product: ...

    @abstractmethod
    def soft_delete(self, entity: Product) -> Product: ...

    @abstractmethod
    def count(self) -> int: ...

    @abstractmethod
    def top_sellers(self, limit: int) -> list: ...
