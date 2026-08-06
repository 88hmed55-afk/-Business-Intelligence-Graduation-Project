import uuid
from typing import Any, Dict

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.models.base import Base, TimestampMixin, UUIDMixin

_VALID_STATUSES = ("draft", "published", "archived")


class Report(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "reports"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'published', 'archived')", name="ck_reports_status"
        ),
        Index("ix_reports_status_created", "status", "created_at"),
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    query: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="draft", server_default="draft"
    )
    schedule: Mapped[str | None] = mapped_column(String(255), nullable=True)
    config: Mapped[Dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default="{}"
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    owner = relationship("User", back_populates="reports")

    def __repr__(self) -> str:
        return f"<Report id={self.id} name={self.name!r} status={self.status!r}>"
