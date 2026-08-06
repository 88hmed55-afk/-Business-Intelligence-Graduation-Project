import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, Index, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDMixin

_VALID_STATUSES = ("active", "inactive", "vip", "prospect")


class Customer(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "customers"
    __table_args__ = (
        CheckConstraint("status IN ('active', 'inactive', 'vip', 'prospect')", name="ck_customers_status"),
        Index("ix_customers_status", "status"),
        Index("ix_customers_city", "city"),
    )

    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True, nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    company: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", server_default="active"
    )
    total_orders: Mapped[int] = mapped_column(default=0, server_default="0", nullable=False)
    total_spent: Mapped[Decimal] = mapped_column(
        Numeric(16, 2), nullable=False, default=0, server_default="0"
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    orders = relationship("Order", back_populates="customer")

    def __repr__(self) -> str:
        return f"<Customer id={self.id} email={self.email!r}>"
