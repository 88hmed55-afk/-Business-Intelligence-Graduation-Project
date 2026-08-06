from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional, Tuple

from app.domain.entities.payment import Payment


class PaymentRepository(ABC):
    """Contract for payment persistence."""

    @abstractmethod
    def get_by_id(self, payment_id: uuid.UUID) -> Optional[Payment]: ...

    @abstractmethod
    def get_by_number(self, payment_number: str) -> Optional[Payment]: ...

    @abstractmethod
    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        order_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        method: Optional[str] = None,
        date_from: Optional[object] = None,
        date_to: Optional[object] = None,
    ) -> Tuple[list[Payment], int]: ...

    @abstractmethod
    def create(self, entity: Payment) -> Payment: ...

    @abstractmethod
    def update(self, entity: Payment) -> Payment: ...

    @abstractmethod
    def delete(self, payment_id: uuid.UUID) -> None: ...

    @abstractmethod
    def sum_paid_for_order(self, order_id: uuid.UUID) -> object: ...
