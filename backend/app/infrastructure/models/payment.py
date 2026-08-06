import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.models.base import Base, TimestampMixin, UUIDMixin

_VALID_STATUSES = ("pending", "completed", "failed", "refunded")
_VALID_METHODS = ("credit_card", "debit_card", "bank_transfer", "cash", "wallet", "paypal")


class Payment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'completed', 'failed', 'refunded')", name="ck_payments_status"),
        CheckConstraint(
            "method IN ('credit_card', 'debit_card', 'bank_transfer', 'cash', 'wallet', 'paypal')",
            name="ck_payments_method",
        ),
        CheckConstraint("amount >= 0", name="ck_payments_amount"),
        Index("ix_payments_order_id", "order_id"),
        Index("ix_payments_status", "status"),
        Index("ix_payments_paid_at", "paid_at"),
    )

    payment_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    order_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(16, 2), nullable=False)
    method: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default="pending"
    )
    transaction_id: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    order = relationship("Order", back_populates="payments")

    def __repr__(self) -> str:
        return f"<Payment id={self.id} number={self.payment_number!r} amount={self.amount}>"
