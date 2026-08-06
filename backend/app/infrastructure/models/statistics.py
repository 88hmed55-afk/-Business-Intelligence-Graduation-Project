from datetime import date
from decimal import Decimal
from typing import Any, Dict

from sqlalchemy import Date, Index, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.models.base import Base, TimestampMixin, UUIDMixin


class StatisticSnapshot(Base, UUIDMixin, TimestampMixin):
    """Rolling aggregate statistics used by the automatic statistics updater."""

    __tablename__ = "statistic_snapshots"
    __table_args__ = (
        UniqueConstraint("period", "metric_key", name="uq_statistic_snapshots_period_key"),
        Index("ix_statistic_snapshots_period", "period"),
    )

    period: Mapped[date] = mapped_column(Date, nullable=False)
    metric_key: Mapped[str] = mapped_column(String(150), nullable=False)
    value: Mapped[Decimal] = mapped_column(Numeric(20, 4), nullable=False, default=0, server_default="0")
    extra: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")

    def __repr__(self) -> str:
        return f"<StatisticSnapshot period={self.period} key={self.metric_key} value={self.value}>"
