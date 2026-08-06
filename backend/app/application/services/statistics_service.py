from __future__ import annotations
import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List

from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.infrastructure.models.statistics import StatisticSnapshot

logger = logging.getLogger("app.statistics")

_METRICS = (
    "revenue",
    "orders",
    "new_customers",
    "avg_order_value",
    "gross_profit",
    "products_sold",
    "payments_received",
)


class StatisticsService:
    """Computes and stores rolling daily business statistics."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def refresh_for_day(self, day: date) -> Dict[str, str]:
        """Upsert all daily metric snapshots for the given day."""
        start = datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc)
        end = start + timedelta(days=1)

        def scalar(sql: str, **params: Any) -> Any:
            from sqlalchemy import text

            return self.db.execute(text(sql), params).scalar()

        revenue = Decimal(str(scalar(
            "SELECT COALESCE(SUM(total_amount), 0) FROM orders "
            "WHERE is_deleted = false AND status NOT IN ('cancelled', 'refunded') "
            "AND order_date >= :start AND order_date < :end",
            start=start, end=end,
        ) or 0))
        orders = int(scalar(
            "SELECT COUNT(*) FROM orders "
            "WHERE is_deleted = false AND status NOT IN ('cancelled', 'refunded') "
            "AND order_date >= :start AND order_date < :end",
            start=start, end=end,
        ) or 0)
        new_customers = int(scalar(
            "SELECT COUNT(*) FROM customers WHERE is_deleted = false "
            "AND created_at >= :start AND created_at < :end",
            start=start, end=end,
        ) or 0)
        products_sold = Decimal(str(scalar(
            "SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi "
            "JOIN orders o ON o.id = oi.order_id "
            "WHERE o.is_deleted = false AND o.status NOT IN ('cancelled', 'refunded') "
            "AND o.order_date >= :start AND o.order_date < :end",
            start=start, end=end,
        ) or 0))
        gross_profit = Decimal(str(scalar(
            "SELECT COALESCE(SUM(o.total_amount), 0) - COALESCE(SUM(oi.quantity * p.cost_price), 0) "
            "FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id "
            "LEFT JOIN products p ON p.id = oi.product_id "
            "WHERE o.is_deleted = false AND o.status NOT IN ('cancelled', 'refunded') "
            "AND o.order_date >= :start AND o.order_date < :end",
            start=start, end=end,
        ) or 0))
        payments_received = Decimal(str(scalar(
            "SELECT COALESCE(SUM(amount), 0) FROM payments "
            "WHERE status = 'completed' AND paid_at >= :start AND paid_at < :end",
            start=start, end=end,
        ) or 0))

        avg_order_value = round(revenue / orders, 2) if orders else Decimal("0")

        metrics: Dict[str, Any] = {
            "revenue": revenue,
            "orders": orders,
            "new_customers": new_customers,
            "avg_order_value": avg_order_value,
            "gross_profit": gross_profit,
            "products_sold": products_sold,
            "payments_received": payments_received,
        }

        self.db.execute(
            sa_delete(StatisticSnapshot).where(StatisticSnapshot.period == day)
        )
        for key, value in metrics.items():
            self.db.add(
                StatisticSnapshot(
                    period=day,
                    metric_key=key,
                    value=value,
                    extra={},
                )
            )
        self.db.commit()
        return {key: str(value) for key, value in metrics.items()}

    def refresh_today(self) -> Dict[str, str]:
        return self.refresh_for_day(datetime.now(timezone.utc).date())

    def refresh_range(self, days: int = 7) -> None:
        today = datetime.now(timezone.utc).date()
        for offset in range(days - 1, -1, -1):
            self.refresh_for_day(today - timedelta(days=offset))

    def snapshot(self, date_from: date, date_to: date) -> List[Dict[str, Any]]:
        rows = self.db.scalars(
            select(StatisticSnapshot)
            .where(StatisticSnapshot.period >= date_from, StatisticSnapshot.period <= date_to)
            .order_by(StatisticSnapshot.period.asc(), StatisticSnapshot.metric_key.asc())
        ).all()
        return [
            {
                "period": row.period.isoformat(),
                "metric_key": row.metric_key,
                "value": str(row.value),
            }
            for row in rows
        ]
