import uuid
from typing import List, Optional

from sqlalchemy import Boolean, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDMixin


class Supplier(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "suppliers"
    __table_args__ = (Index("ix_suppliers_country", "country"),)

    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    contact_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    tax_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    products = relationship("Product", back_populates="supplier")

    def __repr__(self) -> str:
        return f"<Supplier id={self.id} name={self.name!r}>"
