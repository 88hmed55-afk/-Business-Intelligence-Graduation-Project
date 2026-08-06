from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional, Tuple

from app.domain.entities.supplier import Supplier


class SupplierRepository(ABC):
    """Contract for supplier persistence."""

    @abstractmethod
    def get_by_id(self, supplier_id: uuid.UUID) -> Optional[Supplier]: ...

    @abstractmethod
    def get_by_name(self, name: str) -> Optional[Supplier]: ...

    @abstractmethod
    def get_by_email(self, email: str) -> Optional[Supplier]: ...

    @abstractmethod
    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        country: Optional[str] = None,
        is_active: Optional[bool] = None,
        include_deleted: bool = False,
    ) -> Tuple[list[Supplier], int]: ...

    @abstractmethod
    def create(self, entity: Supplier) -> Supplier: ...

    @abstractmethod
    def update(self, entity: Supplier) -> Supplier: ...

    @abstractmethod
    def soft_delete(self, entity: Supplier) -> Supplier: ...

    @abstractmethod
    def count(self) -> int: ...
