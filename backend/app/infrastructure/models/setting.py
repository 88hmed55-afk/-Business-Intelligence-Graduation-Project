from typing import Any, Dict, Optional

from sqlalchemy import Boolean, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base, TimestampMixin, UUIDMixin


class Setting(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "settings"
    __table_args__ = (Index("ix_settings_group", "group_name"),)

    key: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    value: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    group_name: Mapped[str] = mapped_column(String(100), nullable=False, default="general", server_default="general")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_public: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    def __repr__(self) -> str:
        return f"<Setting id={self.id} key={self.key!r}>"
