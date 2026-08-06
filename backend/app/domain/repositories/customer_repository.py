from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple

from app.domain.entities.customer import Customer


class CustomerRepository(ABC):
    """Contract for customer persistence."""

    @abstractmethod
    def get_by_id(self, customer_id: uuid.UUID, include_deleted: bool = False) -> Optional[Customer]: ...

    @abstractmethod
    def get_by_email(self, email: str) -> Optional[Customer]: ...

    @abstractmethod
    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        status: Optional[str] = None,
        country: Optional[str] = None,
        include_deleted: bool = False,
    ) -> Tuple[list[Customer], int]: ...

    @abstractmethod
    def create(self, entity: Customer) -> Customer: ...

    @abstractmethod
    def update(self, entity: Customer) -> Customer: ...

    @abstractmethod
    def soft_delete(self, entity: Customer) -> Customer: ...

    @abstractmethod
    def restore(self, entity: Customer) -> Customer: ...

    @abstractmethod
    def count(self) -> int: ...

    @abstractmethod
    def count_by_status(self, status: str) -> int: ...

    @abstractmethod
    def top_by_spend(self, limit: int) -> List[Customer]: ...

    @abstractmethod
    def update_statistics(self, customer_id: uuid.UUID, total_orders: int, total_spent: object) -> None: ...
