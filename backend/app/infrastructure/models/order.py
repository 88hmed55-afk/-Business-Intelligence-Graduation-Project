import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDMixin

_VALID_STATUSES = ("pending", "processing", "shipped", "delivered", "cancelled", "refunded")
_VALID_PAYMENT_STATUSES = ("unpaid", "partial", "paid", "refunded")


class Order(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')", name="ck_orders_status"),
        CheckConstraint("payment_status IN ('unpaid', 'partial', 'paid', 'refunded')", name="ck_orders_payment_status"),
        CheckConstraint("total_amount >= 0", name="ck_orders_total_amount"),
        Index("ix_orders_status", "status"),
        Index("ix_orders_order_date", "order_date"),
        Index("ix_orders_customer_id", "customer_id"),
        Index("ix_orders_status_order_date", "status", "order_date"),
    )

    order_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", server_default="pending"
    )
    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(16, 2), nullable=False, default=0, server_default="0"
    )
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(16, 2), nullable=False, default=0, server_default="0"
    )
    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(16, 2), nullable=False, default=0, server_default="0"
    )
    shipping_fee: Mapped[Decimal] = mapped_column(
        Numeric(16, 2), nullable=False, default=0, server_default="0"
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(16, 2), nullable=False, default=0, server_default="0"
    )
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="USD", server_default="USD")
    payment_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="unpaid", server_default="unpaid"
    )
    order_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    customer = relationship("Customer", back_populates="orders")
    items: Mapped[List["OrderItem"]] = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Order id={self.id} number={self.order_number!r} total={self.total_amount}>"


class OrderItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_items_quantity"),
        CheckConstraint("line_total >= 0", name="ck_order_items_line_total"),
        Index("ix_order_items_order_id", "order_id"),
        Index("ix_order_items_product_id", "product_id"),
    )

    order_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False, default=0, server_default="0"
    )
    line_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

    def __repr__(self) -> str:
        return f"<OrderItem id={self.id} product_id={self.product_id} qty={self.quantity}>"
