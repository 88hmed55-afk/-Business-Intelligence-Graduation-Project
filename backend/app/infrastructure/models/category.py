import uuid
from typing import List, Optional

from sqlalchemy import ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDMixin


class Category(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(180), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    sort_order: Mapped[int] = mapped_column(default=0, server_default="0", nullable=False)

    parent = relationship(
        "Category", remote_side=lambda: [Category.id], back_populates="children"
    )
    children: Mapped[List["Category"]] = relationship(
        "Category", back_populates="parent", cascade="all, delete-orphan"
    )
    products = relationship("Product", back_populates="category")

    def __repr__(self) -> str:
        return f"<Category id={self.id} name={self.name!r}>"
