from __future__ import annotations
import uuid
from typing import Optional, Tuple

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.domain.entities.payment import Payment
from app.domain.repositories.payment_repository import PaymentRepository
from app.infrastructure.models.payment import Payment as PaymentModel


class SQLAlchemyPaymentRepository(PaymentRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_domain(self, model: Optional[PaymentModel]) -> Optional[Payment]:
        if model is None:
            return None
        return Payment(
            id=model.id,
            payment_number=model.payment_number,
            order_id=model.order_id,
            amount=model.amount,
            method=model.method,
            status=model.status,
            transaction_id=model.transaction_id,
            paid_at=model.paid_at,
            notes=model.notes,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def get_by_id(self, payment_id: uuid.UUID) -> Optional[Payment]:
        return self._to_domain(self.db.get(PaymentModel, payment_id))

    def get_by_number(self, payment_number: str) -> Optional[Payment]:
        stmt = select(PaymentModel).where(PaymentModel.payment_number == payment_number)
        return self._to_domain(self.db.scalar(stmt))

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
    ) -> Tuple[list[Payment], int]:
        stmt = select(PaymentModel)
        if order_id is not None:
            stmt = stmt.where(PaymentModel.order_id == order_id)
        if status:
            stmt = stmt.where(PaymentModel.status == status)
        if method:
            stmt = stmt.where(PaymentModel.method == method)
        if date_from is not None:
            stmt = stmt.where(PaymentModel.paid_at >= date_from)
        if date_to is not None:
            stmt = stmt.where(PaymentModel.paid_at <= date_to)
        if search:
            like = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    PaymentModel.payment_number.ilike(like),
                    PaymentModel.transaction_id.ilike(like),
                )
            )
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(PaymentModel.paid_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return [self._to_domain(r) for r in rows if r], total

    def create(self, entity: Payment) -> Payment:
        model = PaymentModel(
            id=entity.id,
            payment_number=entity.payment_number,
            order_id=entity.order_id,
            amount=entity.amount,
            method=entity.method,
            status=entity.status,
            transaction_id=entity.transaction_id,
            paid_at=entity.paid_at,
            notes=entity.notes,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def update(self, entity: Payment) -> Payment:
        model = self.db.get(PaymentModel, entity.id)
        if model is None:
            raise NotFoundError("Payment not found.")
        model.amount = entity.amount
        model.method = entity.method
        model.status = entity.status
        model.transaction_id = entity.transaction_id
        model.paid_at = entity.paid_at
        model.notes = entity.notes
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def delete(self, payment_id: uuid.UUID) -> None:
        model = self.db.get(PaymentModel, payment_id)
        if model is None:
            raise NotFoundError("Payment not found.")
        self.db.delete(model)
        self.db.commit()

    def sum_paid_for_order(self, order_id: uuid.UUID) -> object:
        return self.db.scalar(
            select(func.coalesce(func.sum(PaymentModel.amount), 0)).where(
                PaymentModel.order_id == order_id, PaymentModel.status == "completed"
            )
        )
