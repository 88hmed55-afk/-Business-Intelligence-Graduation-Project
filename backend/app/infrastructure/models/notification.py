import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.models.base import Base, TimestampMixin, UUIDMixin

_VALID_TYPES = ("info", "success", "warning", "error")


class Notification(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "notifications"
    __table_args__ = (
        CheckConstraint("notification_type IN ('info', 'success', 'warning', 'error')", name="ck_notifications_type"),
        Index("ix_notifications_user_read", "user_id", "is_read"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notification_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="info", server_default="info"
    )
    is_read: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    data: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")

    user = relationship("User")

    def __repr__(self) -> str:
        return f"<Notification id={self.id} user_id={self.user_id} read={self.is_read}>"
