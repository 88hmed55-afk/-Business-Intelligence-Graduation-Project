import uuid
from typing import Any, Dict, Optional

from sqlalchemy import ForeignKey, Index, String, Text, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.models.base import Base, TimestampMixin, UUIDMixin


class ActivityLog(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "activity_logs"
    __table_args__ = (
        Index("ix_activity_logs_user", "user_id"),
        Index("ix_activity_logs_module", "module"),
        Index("ix_activity_logs_entity", "entity_type", "entity_id"),
        Index("ix_activity_logs_created", "created_at"),
    )

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(30), nullable=False)
    module: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    entity_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    summary: Mapped[str] = mapped_column(String(500), nullable=False, default="", server_default="")
    details: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    user = relationship("User")

    def __repr__(self) -> str:
        return f"<ActivityLog id={self.id} module={self.module!r} action={self.action!r}>"
