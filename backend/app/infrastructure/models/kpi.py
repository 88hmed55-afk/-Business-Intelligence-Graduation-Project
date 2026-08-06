import uuid
from decimal import Decimal
from typing import Optional

from sqlalchemy import CheckConstraint, ForeignKey, Index, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.models.base import Base, TimestampMixin, UUIDMixin

_VALID_CATEGORIES = ("finance", "sales", "operations", "marketing", "hr", "it", "other")
_VALID_TRENDS = ("up", "down", "flat")


class KPI(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "kpis"
    __table_args__ = (
        CheckConstraint(
            "category IN ('finance', 'sales', 'operations', 'marketing', 'hr', 'it', 'other')",
            name="ck_kpis_category",
        ),
        CheckConstraint("trend IN ('up', 'down', 'flat')", name="ck_kpis_trend"),
        Index("ix_kpis_category", "category"),
        Index("ix_kpis_dashboard_id", "dashboard_id"),
        Index("ix_kpis_created_by", "created_by"),
    )

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(
        String(50), nullable=False, default="finance", server_default="finance"
    )
    formula: Mapped[str] = mapped_column(Text, nullable=False, default="", server_default="")
    target_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)
    current_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 2), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    trend: Mapped[str] = mapped_column(
        String(20), nullable=False, default="flat", server_default="flat"
    )
    dashboard_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("dashboards.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    owner = relationship("User", back_populates="kpis")
    dashboard = relationship("Dashboard", back_populates="kpis")

    def __repr__(self) -> str:
        return f"<KPI id={self.id} name={self.name!r} category={self.category!r}>"
