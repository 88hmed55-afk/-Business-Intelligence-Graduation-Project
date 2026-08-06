import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.models.base import Base, TimestampMixin, UUIDMixin

_VALID_MOVEMENTS = ("received", "shipped", "adjusted", "returned", "reserved", "released")


class Inventory(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "inventory"
    __table_args__ = (
        Index("ix_inventory_warehouse", "warehouse"),
        Index("ix_inventory_quantity", "quantity"),
    )

    product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("products.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(16, 2), nullable=False, default=0, server_default="0"
    )
    reserved_quantity: Mapped[Decimal] = mapped_column(
        Numeric(16, 2), nullable=False, default=0, server_default="0"
    )
    warehouse: Mapped[str] = mapped_column(String(100), nullable=False, default="main", server_default="main")
    location: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    last_restocked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    product = relationship("Product", back_populates="inventory")
    movements = relationship(
        "InventoryMovement", back_populates="inventory", cascade="all, delete-orphan"
    )

    @property
    def available_quantity(self) -> Decimal:
        return (self.quantity or 0) - (self.reserved_quantity or 0)

    def __repr__(self) -> str:
        return f"<Inventory id={self.id} product_id={self.product_id} quantity={self.quantity}>"


class InventoryMovement(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "inventory_movements"
    __table_args__ = (
        CheckConstraint(
            "movement_type IN ('received', 'shipped', 'adjusted', 'returned', 'reserved', 'released')",
            name="ck_inventory_movements_type",
        ),
        Index("ix_inventory_movements_product", "product_id", "created_at"),
    )

    inventory_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("inventory.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    movement_type: Mapped[str] = mapped_column(String(20), nullable=False)
    quantity_change: Mapped[Decimal] = mapped_column(Numeric(16, 2), nullable=False)
    reference: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    moved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    inventory = relationship("Inventory", back_populates="movements")
    product = relationship("Product")

    def __repr__(self) -> str:
        return f"<InventoryMovement id={self.id} type={self.movement_type} change={self.quantity_change}>"
