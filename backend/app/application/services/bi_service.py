from __future__ import annotations

import math
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.application.schemas.bi import (
    AggregationBucket,
    AggregationResponse,
    ComparisonPeriod,
    ComparisonResponse,
    ExecutiveOverview,
    ForecastPoint,
    ForecastResponse,
    InsightItem,
    InsightsResponse,
    KPIDetail,
    RankingItem,
    RankingResponse,
    TrendDataPoint,
    TrendResponse,
)

_EXCLUDED = "o.is_deleted = false AND o.status NOT IN ('cancelled', 'refunded')"


class BIService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _scalar(self, sql: str, **params: Any) -> Any:
        return self.db.execute(text(sql), params).scalar()

    def _rows(self, sql: str, **params: Any) -> list:
        return self.db.execute(text(sql), params).all()

    # ------------------------------------------------------------------
    # Forecasting (simple linear regression)
    # ------------------------------------------------------------------
    def forecast(
        self, metric: str, periods: int = 6, start: Optional[date] = None, end: Optional[date] = None
    ) -> ForecastResponse:
        if not start:
            start = date.today() - timedelta(days=365)
        if not end:
            end = date.today()

        date_from = datetime.combine(start, datetime.min.time())
        date_to = datetime.combine(end, datetime.min.time())

        if metric == "revenue":
            sql = f"""
                SELECT to_char(o.order_date, 'YYYY-MM') AS period,
                       COALESCE(SUM(o.total_amount), 0) AS val
                FROM orders o
                WHERE {_EXCLUDED} AND o.order_date >= :df AND o.order_date <= :dt
                GROUP BY period ORDER BY period
            """
        elif metric == "orders":
            sql = f"""
                SELECT to_char(o.order_date, 'YYYY-MM') AS period,
                       COUNT(*) AS val
                FROM orders o
                WHERE {_EXCLUDED} AND o.order_date >= :df AND o.order_date <= :dt
                GROUP BY period ORDER BY period
            """
        elif metric == "profit":
            sql = f"""
                SELECT to_char(o.order_date, 'YYYY-MM') AS period,
                       COALESCE(SUM(o.total_amount), 0) - COALESCE(SUM(oi.quantity * p.cost_price), 0) AS val
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                LEFT JOIN products p ON p.id = oi.product_id
                WHERE {_EXCLUDED} AND o.order_date >= :df AND o.order_date <= :dt
                GROUP BY period ORDER BY period
            """
        elif metric == "customers":
            sql = """
                SELECT to_char(created_at, 'YYYY-MM') AS period,
                       COUNT(*) AS val
                FROM customers
                WHERE is_deleted = false AND created_at >= :df AND created_at <= :dt
                GROUP BY period ORDER BY period
            """
        else:
            sql = f"""
                SELECT to_char(o.order_date, 'YYYY-MM') AS period,
                       COALESCE(SUM(o.total_amount), 0) AS val
                FROM orders o
                WHERE {_EXCLUDED} AND o.order_date >= :df AND o.order_date <= :dt
                GROUP BY period ORDER BY period
            """

        rows = self._rows(sql, df=date_from, dt=date_to)
        actuals = [(r.period, float(r.val)) for r in rows]

        if len(actuals) < 2:
            return ForecastResponse(
                metric=metric,
                points=[],
                trend="insufficient_data",
                growth_pct=0.0,
            )

        y_vals = [v for _, v in actuals]
        n = len(y_vals)
        x_vals = list(range(n))
        x_mean = sum(x_vals) / n
        y_mean = sum(y_vals) / n

        ss_xy = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, y_vals))
        ss_xx = sum((x - x_mean) ** 2 for x in x_vals)

        if ss_xx == 0:
            slope = 0.0
        else:
            slope = ss_xy / ss_xx
        intercept = y_mean - slope * x_mean

        y_pred = [intercept + slope * x for x in x_vals]
        residuals = [y - p for y, p in zip(y_vals, y_pred)]
        rmse = math.sqrt(sum(r ** 2 for r in residuals) / n) if n > 0 else 0.0

        last_period = actuals[-1][0]
        year, month = int(last_period[:4]), int(last_period[5:7])

        points: List[ForecastPoint] = []
        cumulative = 0.0

        for period_actual in actuals:
            points.append(ForecastPoint(
                period=period_actual[0],
                actual=period_actual[1],
                predicted=round(period_actual[1], 2),
                lower_bound=round(period_actual[1], 2),
                upper_bound=round(period_actual[1], 2),
            ))
            cumulative += period_actual[1]

        for i in range(1, periods + 1):
            month += 1
            if month > 12:
                month = 1
                year += 1
            pred = max(0, intercept + slope * (n + i - 1))
            lower = max(0, pred - 1.96 * rmse)
            upper = pred + 1.96 * rmse
            points.append(ForecastPoint(
                period=f"{year:04d}-{month:02d}",
                actual=None,
                predicted=round(pred, 2),
                lower_bound=round(lower, 2),
                upper_bound=round(upper, 2),
            ))

        if len(y_vals) >= 2:
            first_half = sum(y_vals[: n // 2]) if n // 2 else y_vals[0]
            second_half = sum(y_vals[n // 2:]) if n // 2 else y_vals[-1]
            growth_pct = ((second_half - first_half) / first_half * 100) if first_half else 0.0
        else:
            growth_pct = 0.0

        trend = "up" if slope > 0.01 else ("down" if slope < -0.01 else "stable")

        return ForecastResponse(
            metric=metric,
            points=points,
            trend=trend,
            growth_pct=round(growth_pct, 2),
            confidence=0.85,
        )

    # ------------------------------------------------------------------
    # Comparison
    # ------------------------------------------------------------------
    def compare(self, start: date, end: date, period_days: Optional[int] = None) -> ComparisonResponse:
        current = self._period_stats(start, end)
        if period_days is None:
            period_days = (end - start).days + 1
        prev_end = start - timedelta(days=1)
        prev_start = prev_end - timedelta(days=period_days - 1)
        previous = self._period_stats(prev_start, prev_end)

        def pct_change(a: float, b: float) -> float:
            if b == 0:
                return 0.0
            return round((a - b) / abs(b) * 100, 2)

        changes = {
            "revenue": pct_change(current.revenue, previous.revenue),
            "orders": pct_change(float(current.orders), float(previous.orders)),
            "profit": pct_change(current.profit, previous.profit),
            "customers": pct_change(float(current.customers), float(previous.customers)),
            "avg_order_value": pct_change(current.avg_order_value, previous.avg_order_value),
        }

        return ComparisonResponse(current=current, previous=previous, changes=changes)

    def _period_stats(self, start: date, end: date) -> ComparisonPeriod:
        df = datetime.combine(start, datetime.min.time())
        dt = datetime.combine(end, datetime.min.time())

        row = self._rows(
            f"""
            SELECT COUNT(*) AS orders,
                   COALESCE(SUM(o.total_amount), 0) AS revenue,
                   COALESCE(SUM(oi.quantity * p.cost_price), 0) AS cogs
            FROM orders o
            LEFT JOIN order_items oi ON oi.order_id = o.id
            LEFT JOIN products p ON p.id = oi.product_id
            WHERE {_EXCLUDED} AND o.order_date >= :df AND o.order_date <= :dt
            """,
            df=df, dt=dt,
        )
        r = row[0] if row else None
        orders = int(r.orders) if r else 0
        revenue = float(r.revenue) if r else 0.0
        cogs = float(r.cogs) if r else 0.0
        profit = revenue - cogs
        aov = revenue / orders if orders else 0.0

        customers = int(self._scalar(
            "SELECT COUNT(DISTINCT customer_id) FROM orders WHERE is_deleted=false "
            "AND status NOT IN ('cancelled','refunded') AND order_date>=:df AND order_date<=:dt",
            df=df, dt=dt,
        ) or 0)

        units = int(self._scalar(
            f"SELECT COALESCE(SUM(oi.quantity),0) FROM order_items oi "
            f"JOIN orders o ON o.id=oi.order_id WHERE {_EXCLUDED} AND o.order_date>=:df AND o.order_date<=:dt",
            df=df, dt=dt,
        ) or 0)

        return ComparisonPeriod(
            label=f"{start.isoformat()} to {end.isoformat()}",
            revenue=round(revenue, 2),
            orders=orders,
            profit=round(profit, 2),
            customers=customers,
            avg_order_value=round(aov, 2),
            units_sold=units,
        )

    # ------------------------------------------------------------------
    # Insights engine
    # ------------------------------------------------------------------
    def generate_insights(self, start: Optional[date] = None, end: Optional[date] = None) -> InsightsResponse:
        if not end:
            end = date.today()
        if not start:
            start = end - timedelta(days=30)

        prev_start = start - (end - start) - timedelta(days=1)
        prev_end = start - timedelta(days=1)

        insights: List[InsightItem] = []

        cur = self._period_stats(start, end)
        prev = self._period_stats(prev_start, prev_end)

        def pct(a: float, b: float) -> float:
            return round((a - b) / abs(b) * 100, 2) if b else 0.0

        r_chg = pct(cur.revenue, prev.revenue)
        if abs(r_chg) > 5:
            insights.append(InsightItem(
                id=str(uuid.uuid4())[:8],
                type="revenue",
                severity="success" if r_chg > 0 else "warning",
                title=f"Revenue {'increased' if r_chg > 0 else 'decreased'} by {abs(r_chg):.1f}%",
                description=f"Revenue moved from ${prev.revenue:,.2f} to ${cur.revenue:,.2f} compared to previous period.",
                metric="revenue",
                change_pct=r_chg,
                period=f"{start} to {end}",
            ))

        o_chg = pct(float(cur.orders), float(prev.orders))
        if abs(o_chg) > 5:
            insights.append(InsightItem(
                id=str(uuid.uuid4())[:8],
                type="orders",
                severity="success" if o_chg > 0 else "warning",
                title=f"Orders {'grew' if o_chg > 0 else 'declined'} by {abs(o_chg):.1f}%",
                description=f"Order volume changed from {prev.orders} to {cur.orders}.",
                metric="orders",
                change_pct=o_chg,
            ))

        p_chg = pct(cur.profit, prev.profit)
        if abs(p_chg) > 5:
            insights.append(InsightItem(
                id=str(uuid.uuid4())[:8],
                type="profit",
                severity="success" if p_chg > 0 else "error",
                title=f"Profit {'improved' if p_chg > 0 else 'dropped'} by {abs(p_chg):.1f}%",
                description=f"Net profit shifted from ${prev.profit:,.2f} to ${cur.profit:,.2f}.",
                metric="profit",
                change_pct=p_chg,
            ))

        inv_rows = self._rows(
            "SELECT p.id, p.name, i.quantity, p.reorder_level "
            "FROM inventory i JOIN products p ON p.id=i.product_id WHERE p.is_deleted=false"
        )
        low_stock = [(r.name, float(r.quantity), float(r.reorder_level or 0)) for r in inv_rows if float(r.quantity) <= float(r.reorder_level or 0)]
        if low_stock:
            worst = min(low_stock, key=lambda x: x[1])
            insights.append(InsightItem(
                id=str(uuid.uuid4())[:8],
                type="inventory",
                severity="error",
                title=f"{len(low_stock)} products low on stock",
                description=f"Critical: '{worst[0]}' has only {worst[1]:.0f} units remaining.",
                metric="low_stock_count",
                change_pct=None,
            ))

        cat_rows = self._rows(
            f"""
            SELECT cat.name AS category,
                   COALESCE(SUM(o.total_amount), 0) AS revenue
            FROM order_items oi
            JOIN orders o ON o.id=oi.order_id
            JOIN products p ON p.id=oi.product_id
            LEFT JOIN categories cat ON cat.id=p.category_id
            WHERE {_EXCLUDED} AND o.order_date >= :df AND o.order_date <= :dt
            GROUP BY cat.name ORDER BY revenue DESC
            """,
            df=datetime.combine(start, datetime.min.time()),
            dt=datetime.combine(end, datetime.min.time()),
        )
        if cat_rows:
            best_cat = cat_rows[0]
            worst_cat = cat_rows[-1]
            insights.append(InsightItem(
                id=str(uuid.uuid4())[:8],
                type="category",
                severity="info",
                title=f"Top category: {best_cat.category or 'Unknown'}",
                description=f"'{best_cat.category or 'Unknown'}' leads with ${float(best_cat.revenue):,.2f} revenue. "
                            f"'{worst_cat.category or 'Unknown'}' is lowest at ${float(worst_cat.revenue):,.2f}.",
                metric="category_revenue",
            ))

        aov = cur.avg_order_value
        prev_aov = prev.avg_order_value
        aov_chg = pct(aov, prev_aov)
        if abs(aov_chg) > 3:
            insights.append(InsightItem(
                id=str(uuid.uuid4())[:8],
                type="aov",
                severity="success" if aov_chg > 0 else "info",
                title=f"Average order value {'rose' if aov_chg > 0 else 'fell'} to ${aov:,.2f}",
                description=f"Change of {aov_chg:+.1f}% from ${prev_aov:,.2f}.",
                metric="avg_order_value",
                change_pct=aov_chg,
            ))

        top_products = self._rows(
            f"""
            SELECT p.name, COALESCE(SUM(oi.quantity),0) AS sold
            FROM order_items oi
            JOIN orders o ON o.id=oi.order_id
            JOIN products p ON p.id=oi.product_id
            WHERE {_EXCLUDED} AND o.order_date >= :df AND o.order_date <= :dt
            GROUP BY p.name ORDER BY sold DESC LIMIT 5
            """,
            df=datetime.combine(start, datetime.min.time()),
            dt=datetime.combine(end, datetime.min.time()),
        )
        if top_products:
            insights.append(InsightItem(
                id=str(uuid.uuid4())[:8],
                type="products",
                severity="success",
                title=f"Best seller: {top_products[0].name}",
                description=f"Top 5 products account for significant volume. Lead: {top_products[0].name}.",
                metric="top_product",
            ))

        return InsightsResponse(
            insights=insights,
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

    # ------------------------------------------------------------------
    # Aggregation
    # ------------------------------------------------------------------
    def aggregate(self, dimension: str, start: date, end: date) -> AggregationResponse:
        df = datetime.combine(start, datetime.min.time())
        dt = datetime.combine(end, datetime.min.time())

        if dimension == "category":
            sql = f"""
                SELECT cat.name AS label,
                       COALESCE(SUM(o.total_amount), 0) AS value,
                       COUNT(DISTINCT o.id) AS cnt
                FROM order_items oi
                JOIN orders o ON o.id=oi.order_id
                JOIN products p ON p.id=oi.product_id
                LEFT JOIN categories cat ON cat.id=p.category_id
                WHERE {_EXCLUDED} AND o.order_date>=:df AND o.order_date<=:dt
                GROUP BY cat.name ORDER BY value DESC
            """
        elif dimension == "status":
            sql = f"""
                SELECT o.status AS label,
                       COUNT(*) AS cnt,
                       COALESCE(SUM(o.total_amount), 0) AS value
                FROM orders o
                WHERE o.is_deleted=false AND o.order_date>=:df AND o.order_date<=:dt
                GROUP BY o.status ORDER BY cnt DESC
            """
        elif dimension == "warehouse":
            sql = """
                SELECT i.warehouse AS label,
                       COALESCE(SUM(i.quantity * p.unit_price), 0) AS value,
                       COUNT(*) AS cnt
                FROM inventory i
                JOIN products p ON p.id=i.product_id WHERE p.is_deleted=false
                GROUP BY i.warehouse ORDER BY value DESC
            """
        elif dimension == "country":
            sql = f"""
                SELECT COALESCE(c.country, 'Unknown') AS label,
                       COALESCE(SUM(o.total_amount), 0) AS value,
                       COUNT(DISTINCT o.id) AS cnt
                FROM orders o
                JOIN customers c ON c.id=o.customer_id
                WHERE {_EXCLUDED} AND o.order_date>=:df AND o.order_date<=:dt
                GROUP BY c.country ORDER BY value DESC
            """
        elif dimension == "payment_method":
            sql = f"""
                SELECT pm.method AS label,
                       COALESCE(SUM(pm.amount), 0) AS value,
                       COUNT(*) AS cnt
                FROM payments pm
                WHERE pm.status='completed' AND pm.paid_at>=:df AND pm.paid_at<=:dt
                GROUP BY pm.method ORDER BY value DESC
            """
        else:
            sql = f"""
                SELECT o.status AS label,
                       COUNT(*) AS cnt,
                       COALESCE(SUM(o.total_amount), 0) AS value
                FROM orders o
                WHERE o.is_deleted=false AND o.order_date>=:df AND o.order_date<=:dt
                GROUP BY o.status ORDER BY cnt DESC
            """

        rows = self._rows(sql, df=df, dt=dt)
        total = sum(float(r.value) for r in rows)

        buckets = []
        for r in rows:
            v = float(r.value)
            buckets.append(AggregationBucket(
                label=r.label or "Unknown",
                value=round(v, 2),
                count=int(r.cnt),
                percentage=round(v / total * 100, 2) if total else 0.0,
            ))

        return AggregationResponse(dimension=dimension, buckets=buckets, total=round(total, 2))

    # ------------------------------------------------------------------
    # Rankings
    # ------------------------------------------------------------------
    def rankings(self, dimension: str, start: date, end: date, limit: int = 10) -> RankingResponse:
        df = datetime.combine(start, datetime.min.time())
        dt = datetime.combine(end, datetime.min.time())

        if dimension == "products":
            sql = f"""
                SELECT p.id AS pid, p.name,
                       COALESCE(SUM(o.total_amount), 0) AS value,
                       COALESCE(SUM(oi.quantity), 0) AS secondary
                FROM order_items oi
                JOIN orders o ON o.id=oi.order_id
                JOIN products p ON p.id=oi.product_id AND p.is_deleted=false
                WHERE {_EXCLUDED} AND o.order_date>=:df AND o.order_date<=:dt
                GROUP BY p.id, p.name ORDER BY value DESC LIMIT :lim
            """
        elif dimension == "customers":
            sql = f"""
                SELECT c.id AS pid,
                       COALESCE(c.company, c.first_name || ' ' || c.last_name) AS name,
                       COALESCE(SUM(o.total_amount), 0) AS value,
                       COUNT(o.id) AS secondary
                FROM orders o
                JOIN customers c ON c.id=o.customer_id AND c.is_deleted=false
                WHERE {_EXCLUDED} AND o.order_date>=:df AND o.order_date<=:dt
                GROUP BY c.id, c.company, c.first_name, c.last_name ORDER BY value DESC LIMIT :lim
            """
        elif dimension == "employees":
            sql = """
                SELECT e.id AS pid,
                       e.first_name || ' ' || e.last_name AS name,
                       COUNT(DISTINCT o.id) AS value,
                       COALESCE(SUM(o.total_amount), 0) AS secondary
                FROM orders o
                JOIN employees e ON e.id=o.employee_id
                WHERE o.is_deleted=false AND o.status NOT IN ('cancelled','refunded')
                GROUP BY e.id, e.first_name, e.last_name ORDER BY value DESC LIMIT :lim
            """
        elif dimension == "suppliers":
            sql = """
                SELECT s.id AS pid, s.name,
                       COUNT(DISTINCT p.id) AS value,
                       COALESCE(SUM(p.unit_price), 0) AS secondary
                FROM products p
                JOIN suppliers s ON s.id=p.supplier_id AND s.is_deleted=false
                WHERE p.is_deleted=false
                GROUP BY s.id, s.name ORDER BY value DESC LIMIT :lim
            """
        elif dimension == "categories":
            sql = f"""
                SELECT cat.id AS pid, cat.name,
                       COALESCE(SUM(o.total_amount), 0) AS value,
                       COUNT(DISTINCT o.id) AS secondary
                FROM order_items oi
                JOIN orders o ON o.id=oi.order_id
                JOIN products p ON p.id=oi.product_id
                LEFT JOIN categories cat ON cat.id=p.category_id
                WHERE {_EXCLUDED} AND o.order_date>=:df AND o.order_date<=:dt
                GROUP BY cat.id, cat.name ORDER BY value DESC LIMIT :lim
            """
        else:
            sql = f"""
                SELECT p.id AS pid, p.name,
                       COALESCE(SUM(o.total_amount), 0) AS value,
                       COALESCE(SUM(oi.quantity), 0) AS secondary
                FROM order_items oi
                JOIN orders o ON o.id=oi.order_id
                JOIN products p ON p.id=oi.product_id AND p.is_deleted=false
                WHERE {_EXCLUDED} AND o.order_date>=:df AND o.order_date<=:dt
                GROUP BY p.id, p.name ORDER BY value DESC LIMIT :lim
            """

        rows = self._rows(sql, df=df, dt=dt, lim=limit)
        items = [
            RankingItem(
                rank=i + 1,
                id=str(r.pid) if hasattr(r, "pid") else None,
                name=r.name or "Unknown",
                value=round(float(r.value), 2),
                secondary_value=round(float(r.secondary), 2) if r.secondary else None,
            )
            for i, r in enumerate(rows)
        ]
        return RankingResponse(dimension=dimension, items=items, period=f"{start} to {end}")

    # ------------------------------------------------------------------
    # Trends
    # ------------------------------------------------------------------
    def trend(self, metric: str, granularity: str, start: date, end: date) -> TrendResponse:
        df = datetime.combine(start, datetime.min.time())
        dt = datetime.combine(end, datetime.min.time())

        if granularity == "daily":
            fmt = "YYYY-MM-DD"
        elif granularity == "quarterly":
            fmt = 'YYYY-"Q"Q'
        else:
            fmt = "YYYY-MM"

        if metric == "revenue":
            sql = f"""
                SELECT to_char(o.order_date, :fmt) AS period,
                       COALESCE(SUM(o.total_amount), 0) AS val
                FROM orders o WHERE {_EXCLUDED} AND o.order_date>=:df AND o.order_date<=:dt
                GROUP BY period ORDER BY period
            """
        elif metric == "orders":
            sql = f"""
                SELECT to_char(o.order_date, :fmt) AS period,
                       COUNT(*) AS val
                FROM orders o WHERE {_EXCLUDED} AND o.order_date>=:df AND o.order_date<=:dt
                GROUP BY period ORDER BY period
            """
        elif metric == "profit":
            sql = f"""
                SELECT to_char(o.order_date, :fmt) AS period,
                       COALESCE(SUM(o.total_amount),0) - COALESCE(SUM(oi.quantity*p.cost_price),0) AS val
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id=o.id
                LEFT JOIN products p ON p.id=oi.product_id
                WHERE {_EXCLUDED} AND o.order_date>=:df AND o.order_date<=:dt
                GROUP BY period ORDER BY period
            """
        elif metric == "customers":
            sql = f"""
                SELECT to_char(created_at, :fmt) AS period, COUNT(*) AS val
                FROM customers WHERE is_deleted=false AND created_at>=:df AND created_at<=:dt
                GROUP BY period ORDER BY period
            """
        else:
            sql = f"""
                SELECT to_char(o.order_date, :fmt) AS period,
                       COALESCE(SUM(o.total_amount), 0) AS val
                FROM orders o WHERE {_EXCLUDED} AND o.order_date>=:df AND o.order_date<=:dt
                GROUP BY period ORDER BY period
            """

        rows = self._rows(sql, df=df, dt=dt, fmt=fmt)
        values = []
        cumulative = 0.0
        for r in rows:
            v = float(r.val)
            cumulative += v
            values.append(TrendDataPoint(period=r.period, value=round(v, 2), cumulative=round(cumulative, 2)))

        total = cumulative
        avg = total / len(values) if values else 0.0
        vals_list = [p.value for p in values]

        return TrendResponse(
            metric=metric,
            granularity=granularity,
            points=values,
            total=round(total, 2),
            average=round(avg, 2),
            min_value=round(min(vals_list), 2) if vals_list else 0.0,
            max_value=round(max(vals_list), 2) if vals_list else 0.0,
        )

    # ------------------------------------------------------------------
    # Executive overview (all-in-one for the executive dashboard)
    # ------------------------------------------------------------------
    def executive_overview(self, start: Optional[date] = None, end: Optional[date] = None) -> ExecutiveOverview:
        if not end:
            end = date.today()
        if not start:
            start = end - timedelta(days=365)

        prev_start = start - (end - start) - timedelta(days=1)
        prev_end = start - timedelta(days=1)
        cur = self._period_stats(start, end)
        prev = self._period_stats(prev_start, prev_end)

        def pct(a: float, b: float) -> Optional[float]:
            if b == 0:
                return None
            return round((a - b) / abs(b) * 100, 2)

        kpis = [
            KPIDetail(key="revenue", label="Total Revenue", value=cur.revenue, previous_value=prev.revenue, change_pct=pct(cur.revenue, prev.revenue), trend="up" if (cur.revenue > prev.revenue) else "down", format="currency", icon="dollar"),
            KPIDetail(key="profit", label="Net Profit", value=cur.profit, previous_value=prev.profit, change_pct=pct(cur.profit, prev.profit), trend="up" if (cur.profit > prev.profit) else "down", format="currency", icon="trending-up"),
            KPIDetail(key="orders", label="Total Orders", value=float(cur.orders), previous_value=float(prev.orders), change_pct=pct(float(cur.orders), float(prev.orders)), trend="up" if (cur.orders > prev.orders) else "down", format="integer", icon="shopping-cart"),
            KPIDetail(key="customers", label="Total Customers", value=float(cur.customers), previous_value=float(prev.customers), change_pct=pct(float(cur.customers), float(prev.customers)), trend="up" if (cur.customers > prev.customers) else "down", format="integer", icon="users"),
            KPIDetail(key="aov", label="Avg Order Value", value=cur.avg_order_value, previous_value=prev.avg_order_value, change_pct=pct(cur.avg_order_value, prev.avg_order_value), trend="up" if (cur.avg_order_value > prev.avg_order_value) else "down", format="currency", icon="target"),
            KPIDetail(key="units", label="Units Sold", value=float(cur.units_sold), previous_value=float(prev.units_sold), change_pct=pct(float(cur.units_sold), float(prev.units_sold)), trend="up" if (cur.units_sold > prev.units_sold) else "down", format="integer", icon="package"),
        ]

        rev_trend = self.trend("revenue", "monthly", start, end)
        profit_trend = self.trend("profit", "monthly", start, end)

        order_statuses = self._rows(
            f"SELECT status, COUNT(*) AS cnt FROM orders o "
            f"WHERE o.is_deleted=false AND o.order_date>=:df AND o.order_date<=:dt GROUP BY status",
            df=datetime.combine(start, datetime.min.time()),
            dt=datetime.combine(end, datetime.min.time()),
        )
        status_map = {r.status: int(r.cnt) for r in order_statuses}

        top_prods = self.rankings("products", start, end, 10)
        top_custs = self.rankings("customers", start, end, 10)
        cat_agg = self.aggregate("category", start, end)

        return ExecutiveOverview(
            kpis=kpis,
            revenue_chart=[{"period": p.period, "revenue": p.value, "cumulative": p.cumulative} for p in rev_trend.points],
            profit_chart=[{"period": p.period, "profit": p.value, "cumulative": p.cumulative} for p in profit_trend.points],
            order_status=status_map,
            top_products=[{"name": i.name, "value": i.value, "secondary": i.secondary_value} for i in top_prods.items],
            top_customers=[{"name": i.name, "value": i.value, "orders": i.secondary_value} for i in top_custs.items],
            category_split=[{"name": b.label, "value": b.value, "percentage": b.percentage} for b in cat_agg.buckets],
            monthly_trend=[{"period": p.period, "revenue": p.value, "profit": p.value} for p in rev_trend.points],
        )
