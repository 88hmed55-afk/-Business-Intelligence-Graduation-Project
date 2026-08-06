import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Index, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDMixin


class Product(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "products"
    __table_args__ = (
        Index("ix_products_name", "name"),
        Index("ix_products_category_id", "category_id"),
        Index("ix_products_supplier_id", "supplier_id"),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    barcode: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    supplier_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True
    )
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False, default=0, server_default="0"
    )
    cost_price: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False, default=0, server_default="0"
    )
    reorder_level: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False, default=0, server_default="0"
    )
    weight_kg: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 3), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    category = relationship("Category", back_populates="products")
    supplier = relationship("Supplier", back_populates="products")
    inventory = relationship("Inventory", back_populates="product", uselist=False, cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="product")

    def __repr__(self) -> str:
        return f"<Product id={self.id} name={self.name!r} sku={self.sku!r}>"
