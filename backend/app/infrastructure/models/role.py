import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, String, Table, Text, Uuid, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.models.base import Base, TimestampMixin, UUIDMixin

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Uuid, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", Uuid, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class Role(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "roles"
    __table_args__ = (
        CheckConstraint(
            "name IN ('admin', 'analyst', 'viewer', 'sales_manager', 'inventory_manager')",
            name="ck_roles_name",
        ),
    )

    name: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_system: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    permissions: Mapped[List["Permission"]] = relationship(
        secondary=role_permissions, back_populates="roles", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Role id={self.id} name={self.name!r}>"


class Permission(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "permissions"
    __table_args__ = (
        CheckConstraint(
            "action IN ('read', 'create', 'update', 'delete', 'export', 'publish')",
            name="ck_permissions_action",
        ),
    )

    code: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    module: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(20), nullable=False)

    roles: Mapped[List["Role"]] = relationship(
        secondary=role_permissions, back_populates="permissions", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Permission id={self.id} code={self.code!r}>"
