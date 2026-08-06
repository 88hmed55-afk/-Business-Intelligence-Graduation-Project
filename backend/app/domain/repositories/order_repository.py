from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple

from app.domain.entities.order import Order, OrderItem


class OrderRepository(ABC):
    """Contract for order persistence."""

    @abstractmethod
    def get_by_id(self, order_id: uuid.UUID) -> Optional[Order]: ...

    @abstractmethod
    def get_by_number(self, order_number: str) -> Optional[Order]: ...

    @abstractmethod
    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        customer_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        payment_status: Optional[str] = None,
        date_from: Optional[object] = None,
        date_to: Optional[object] = None,
        include_deleted: bool = False,
    ) -> Tuple[list[Order], int]: ...

    @abstractmethod
    def create(self, entity: Order) -> Order: ...

    @abstractmethod
    def update(self, entity: Order) -> Order: ...

    @abstractmethod
    def soft_delete(self, entity: Order) -> Order: ...

    @abstractmethod
    def count(self) -> int: ...

    @abstractmethod
    def count_by_status(self, status: str) -> int: ...

    @abstractmethod
    def revenue(self) -> object: ...

    @abstractmethod
    def customer_totals(self, customer_id: uuid.UUID) -> Tuple[int, object]: ...
