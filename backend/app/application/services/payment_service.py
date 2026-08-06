from __future__ import annotations
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, Tuple

from app.application.schemas.payment import PaymentCreate, PaymentUpdate
from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.domain.entities.payment import Payment
from app.domain.repositories.order_repository import OrderRepository
from app.domain.repositories.payment_repository import PaymentRepository
from app.shared.utils.helpers import sanitize_text, utc_now


class PaymentService:
    def __init__(self, payment_repo: PaymentRepository, order_repo: OrderRepository) -> None:
        self.payment_repo = payment_repo
        self.order_repo = order_repo

    def list(
        self,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        order_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        method: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> Tuple[list[Payment], int]:
        return self.payment_repo.list(
            page=page,
            page_size=page_size,
            search=search,
            order_id=order_id,
            status=status,
            method=method,
            date_from=date_from,
            date_to=date_to,
        )

    def get(self, payment_id: uuid.UUID) -> Payment:
        payment = self.payment_repo.get_by_id(payment_id)
        if payment is None:
            raise NotFoundError("Payment not found.")
        return payment

    def create(self, data: PaymentCreate) -> Payment:
        order = self.order_repo.get_by_id(data.order_id)
        if order is None or order.is_deleted:
            raise NotFoundError("Order not found.")
        if data.status.value == "completed" and data.paid_at is None:
            data.paid_at = utc_now()
        now = utc_now()
        entity = Payment(
            id=uuid.uuid4(),
            payment_number=self._generate_number(),
            order_id=data.order_id,
            amount=data.amount,
            method=data.method.value,
            status=data.status.value,
            transaction_id=sanitize_text(data.transaction_id) if data.transaction_id else None,
            paid_at=data.paid_at,
            notes=sanitize_text(data.notes) if data.notes else None,
            created_at=now,
            updated_at=now,
        )
        created = self.payment_repo.create(entity)
        self._sync_order_payment_status(created.order_id)
        return created

    def update(self, payment_id: uuid.UUID, data: PaymentUpdate) -> Payment:
        payment = self.get(payment_id)
        provided = data.model_fields_set

        if "amount" in provided and data.amount is not None:
            payment.amount = data.amount
        if "method" in provided and data.method is not None:
            payment.method = data.method.value
        if "status" in provided and data.status is not None:
            payment.status = data.status.value
            if data.status.value == "completed" and payment.paid_at is None:
                payment.paid_at = utc_now()
        if "transaction_id" in provided:
            payment.transaction_id = sanitize_text(data.transaction_id) if data.transaction_id else None
        if "paid_at" in provided:
            payment.paid_at = data.paid_at
        if "notes" in provided:
            payment.notes = sanitize_text(data.notes) if data.notes else None

        payment.updated_at = utc_now()
        updated = self.payment_repo.update(payment)
        self._sync_order_payment_status(updated.order_id)
        return updated

    def delete(self, payment_id: uuid.UUID) -> None:
        payment = self.get(payment_id)
        self.payment_repo.delete(payment.id)
        self._sync_order_payment_status(payment.order_id)

    def _sync_order_payment_status(self, order_id: uuid.UUID) -> None:
        order = self.order_repo.get_by_id(order_id)
        if order is None:
            return
        paid = self.payment_repo.sum_paid_for_order(order_id)
        total = order.total_amount or Decimal("0")
        if paid <= 0:
            new_status = "unpaid"
        elif paid >= total:
            new_status = "paid"
        else:
            new_status = "partial"
        if new_status != order.payment_status:
            order.payment_status = new_status
            order.updated_at = utc_now()
            self.order_repo.update(order)

    @staticmethod
    def _generate_number() -> str:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
        return f"PAY-{stamp}-{uuid.uuid4().hex[:10].upper()}"
