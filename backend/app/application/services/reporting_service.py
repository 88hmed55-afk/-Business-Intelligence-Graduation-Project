from __future__ import annotations
import math
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.application.schemas.reporting import (
    CustomerReportRow,
    InventoryReportRow,
    MonthlyReportRow,
    ProductReportRow,
    ProfitReportRow,
    ReportResponse,
    SalesReportRow,
    YearlyReportRow,
)
from app.core.constants import CACHE_OVERVIEW_KEY, CACHE_STATISTICS_TTL_SECONDS
from app.core.exceptions import BadRequestError
from app.core.redis import get_redis
from app.shared.utils.helpers import safe_round

_EXCLUDED_STATUSES = ("cancelled", "refunded")
_EXCLUDED_CLAUSE = "o.is_deleted = false AND o.status NOT IN (:ex1, :ex2)"


class ReportingService:
    """Business intelligence layer. All queries use bound parameters."""

    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # Sales report
    # ------------------------------------------------------------------
    def sales_report(self, date_from: datetime, date_to: datetime) -> ReportResponse[SalesReportRow]:
        self._validate_range(date_from, date_to)
        orders = self.db.execute(
            text(
                f"""
                SELECT to_char(o.order_date, 'YYYY-MM-DD') AS period,
                       COUNT(*) AS order_count,
                       COALESCE(SUM(o.subtotal), 0) AS gross_revenue,
                       COALESCE(SUM(o.discount_amount), 0) AS discount_total,
                       COALESCE(SUM(o.total_amount), 0) AS net_revenue,
                       CASE WHEN COUNT(*) > 0 THEN SUM(o.total_amount) / COUNT(*) ELSE 0 END AS avg_order_value
                FROM orders o
                WHERE {_EXCLUDED_CLAUSE} AND o.order_date >= :date_from AND o.order_date <= :date_to
                GROUP BY period
                ORDER BY period
                """
            ),
            {"date_from": date_from, "date_to": date_to, "ex1": _EXCLUDED_STATUSES[0], "ex2": _EXCLUDED_STATUSES[1]},
        ).all()

        units = self.db.execute(
            text(
                f"""
                SELECT to_char(o.order_date, 'YYYY-MM-DD') AS period,
                       COALESCE(SUM(oi.quantity), 0) AS units_sold
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE {_EXCLUDED_CLAUSE} AND o.order_date >= :date_from AND o.order_date <= :date_to
                GROUP BY period
                """
            ),
            {"date_from": date_from, "date_to": date_to, "ex1": _EXCLUDED_STATUSES[0], "ex2": _EXCLUDED_STATUSES[1]},
        ).all()
        units_map = {row.period: row.units_sold for row in units}

        rows = [
            SalesReportRow(
                period=r.period,
                order_count=int(r.order_count),
                units_sold=Decimal(str(units_map.get(r.period, 0))),
                gross_revenue=Decimal(str(r.gross_revenue)),
                discount_total=Decimal(str(r.discount_total)),
                net_revenue=Decimal(str(r.net_revenue)),
                avg_order_value=Decimal(str(r.avg_order_value)),
            )
            for r in orders
        ]
        summary = self._sales_summary(rows, date_from, date_to)
        return ReportResponse[SalesReportRow](
            rows=rows,
            summary=summary,
            filters={"type": "sales", "date_from": date_from.isoformat(), "date_to": date_to.isoformat()},
        )

    def _sales_summary(self, rows: List[SalesReportRow], date_from: datetime, date_to: datetime) -> Dict[str, Any]:
        total_revenue = sum((r.net_revenue for r in rows), Decimal("0"))
        total_orders = sum((r.order_count for r in rows), 0)
        return {
            "total_revenue": total_revenue,
            "total_orders": total_orders,
            "total_discounts": sum((r.discount_total for r in rows), Decimal("0")),
            "avg_order_value": round(total_revenue / total_orders, 2) if total_orders else Decimal("0"),
            "days": (date_to.date() - date_from.date()).days + 1,
        }

    # ------------------------------------------------------------------
    # Profit report
    # ------------------------------------------------------------------
    def profit_report(self, date_from: datetime, date_to: datetime) -> ReportResponse[ProfitReportRow]:
        self._validate_range(date_from, date_to)
        rows_raw = self.db.execute(
            text(
                f"""
                SELECT to_char(o.order_date, 'YYYY-MM-DD') AS period,
                       COALESCE(SUM(o.total_amount), 0) AS revenue,
                       COALESCE(SUM(oi.quantity * p.cost_price), 0) AS cogs,
                       COALESCE(SUM(o.tax_amount), 0) AS tax_total
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                LEFT JOIN products p ON p.id = oi.product_id
                WHERE {_EXCLUDED_CLAUSE} AND o.order_date >= :date_from AND o.order_date <= :date_to
                GROUP BY period
                ORDER BY period
                """
            ),
            {"date_from": date_from, "date_to": date_to, "ex1": _EXCLUDED_STATUSES[0], "ex2": _EXCLUDED_STATUSES[1]},
        ).all()

        rows = []
        for r in rows_raw:
            revenue = Decimal(str(r.revenue))
            cogs = Decimal(str(r.cogs))
            gross_profit = revenue - cogs
            margin_pct = (gross_profit / revenue * 100) if revenue else Decimal("0")
            tax_total = Decimal(str(r.tax_total))
            rows.append(
                ProfitReportRow(
                    period=r.period,
                    revenue=revenue,
                    cogs=cogs,
                    gross_profit=gross_profit,
                    margin_pct=Decimal(str(round(margin_pct, 2))),
                    tax_total=tax_total,
                    net_profit=gross_profit - tax_total,
                )
            )
        total_profit = sum((r.net_profit for r in rows), Decimal("0"))
        total_revenue = sum((r.revenue for r in rows), Decimal("0"))
        summary = {
            "total_revenue": total_revenue,
            "total_cogs": sum((r.cogs for r in rows), Decimal("0")),
            "gross_profit": sum((r.gross_profit for r in rows), Decimal("0")),
            "net_profit": total_profit,
            "net_margin_pct": round(total_profit / total_revenue * 100, 2) if total_revenue else Decimal("0"),
        }
        return ReportResponse[ProfitReportRow](
            rows=rows,
            summary=summary,
            filters={"type": "profit", "date_from": date_from.isoformat(), "date_to": date_to.isoformat()},
        )

    # ------------------------------------------------------------------
    # Customer report
    # ------------------------------------------------------------------
    def customer_report(self, date_from: datetime, date_to: datetime, limit: int = 100) -> ReportResponse[CustomerReportRow]:
        self._validate_range(date_from, date_to)
        rows = self.db.execute(
            text(
                f"""
                SELECT c.id AS customer_id,
                       COALESCE(c.company, c.first_name || ' ' || c.last_name) AS customer_name,
                       COUNT(o.id) AS total_orders,
                       COALESCE(SUM(o.total_amount), 0) AS total_spent,
                       CASE WHEN COUNT(o.id) > 0 THEN SUM(o.total_amount) / COUNT(o.id) ELSE 0 END AS avg_order_value,
                       MAX(o.order_date) AS last_order_date
                FROM customers c
                LEFT JOIN orders o ON o.customer_id = c.id AND {_EXCLUDED_CLAUSE}
                                   AND o.order_date >= :date_from AND o.order_date <= :date_to
                WHERE c.is_deleted = false
                GROUP BY c.id, c.company, c.first_name, c.last_name
                ORDER BY total_spent DESC
                LIMIT :limit
                """
            ),
            {
                "date_from": date_from,
                "date_to": date_to,
                "ex1": _EXCLUDED_STATUSES[0],
                "ex2": _EXCLUDED_STATUSES[1],
                "limit": limit,
            },
        ).all()
        report_rows = [
            CustomerReportRow(
                customer_id=r.customer_id,
                customer_name=r.customer_name,
                total_orders=int(r.total_orders or 0),
                total_spent=Decimal(str(r.total_spent or 0)),
                avg_order_value=Decimal(str(r.avg_order_value or 0)),
                last_order_date=r.last_order_date,
            )
            for r in rows
        ]
        summary = {
            "customers": len(report_rows),
            "total_spent": sum((r.total_spent for r in report_rows), Decimal("0")),
        }
        return ReportResponse[CustomerReportRow](
            rows=report_rows,
            summary=summary,
            filters={"type": "customer", "date_from": date_from.isoformat(), "date_to": date_to.isoformat()},
        )

    # ------------------------------------------------------------------
    # Product report
    # ------------------------------------------------------------------
    def product_report(self, date_from: datetime, date_to: datetime) -> ReportResponse[ProductReportRow]:
        self._validate_range(date_from, date_to)
        rows = self.db.execute(
            text(
                f"""
                SELECT p.id AS product_id, p.name AS product_name, p.sku,
                       cat.name AS category,
                       COALESCE(SUM(oi.quantity), 0) AS units_sold,
                       COALESCE(SUM(oi.line_total), 0) AS revenue,
                       COALESCE(SUM(oi.quantity * p.cost_price), 0) AS cogs
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                JOIN products p ON p.id = oi.product_id AND p.is_deleted = false
                LEFT JOIN categories cat ON cat.id = p.category_id
                WHERE {_EXCLUDED_CLAUSE} AND o.order_date >= :date_from AND o.order_date <= :date_to
                GROUP BY p.id, p.name, p.sku, cat.name
                ORDER BY revenue DESC
                """
            ),
            {"date_from": date_from, "date_to": date_to, "ex1": _EXCLUDED_STATUSES[0], "ex2": _EXCLUDED_STATUSES[1]},
        ).all()
        report_rows = []
        for r in rows:
            revenue = Decimal(str(r.revenue))
            cogs = Decimal(str(r.cogs))
            report_rows.append(
                ProductReportRow(
                    product_id=r.product_id,
                    product_name=r.product_name,
                    sku=r.sku,
                    category=r.category,
                    units_sold=Decimal(str(r.units_sold)),
                    revenue=revenue,
                    cogs=cogs,
                    profit=revenue - cogs,
                )
            )
        summary = {
            "products": len(report_rows),
            "revenue": sum((r.revenue for r in report_rows), Decimal("0")),
            "profit": sum((r.profit for r in report_rows), Decimal("0")),
        }
        return ReportResponse[ProductReportRow](
            rows=report_rows,
            summary=summary,
            filters={"type": "product", "date_from": date_from.isoformat(), "date_to": date_to.isoformat()},
        )

    # ------------------------------------------------------------------
    # Inventory report
    # ------------------------------------------------------------------
    def inventory_report(self, warehouse: Optional[str] = None) -> ReportResponse[InventoryReportRow]:
        params: Dict[str, Any] = {}
        warehouse_clause = ""
        if warehouse:
            warehouse_clause = "AND i.warehouse = :warehouse"
            params["warehouse"] = warehouse

        rows = self.db.execute(
            text(
                f"""
                SELECT p.id AS product_id, p.name AS product_name, p.sku, i.warehouse,
                       i.quantity, i.reserved_quantity,
                       i.quantity - i.reserved_quantity AS available_quantity,
                       p.reorder_level,
                       i.quantity * p.unit_price AS stock_value
                FROM inventory i
                JOIN products p ON p.id = i.product_id AND p.is_deleted = false
                WHERE 1 = 1 {warehouse_clause}
                ORDER BY p.name ASC
                """
            ),
            params,
        ).all()

        report_rows = []
        for r in rows:
            quantity = Decimal(str(r.quantity))
            reorder_level = Decimal(str(r.reorder_level or 0))
            if quantity <= 0:
                status = "out_of_stock"
            elif quantity <= reorder_level:
                status = "low"
            else:
                status = "ok"
            report_rows.append(
                InventoryReportRow(
                    product_id=r.product_id,
                    product_name=r.product_name,
                    sku=r.sku,
                    warehouse=r.warehouse,
                    quantity=quantity,
                    reserved_quantity=Decimal(str(r.reserved_quantity or 0)),
                    available_quantity=Decimal(str(r.available_quantity or 0)),
                    reorder_level=reorder_level,
                    stock_value=Decimal(str(r.stock_value or 0)),
                    status=status,
                )
            )

        total_value = sum((r.stock_value for r in report_rows), Decimal("0"))
        low_count = sum((1 for r in report_rows if r.status in ("low", "out_of_stock")), 0)
        summary = {
            "items": len(report_rows),
            "total_stock_value": total_value,
            "low_stock_count": low_count,
            "out_of_stock_count": sum((1 for r in report_rows if r.status == "out_of_stock"), 0),
        }
        return ReportResponse[InventoryReportRow](
            rows=report_rows,
            summary=summary,
            filters={"type": "inventory", "warehouse": warehouse},
        )

    # ------------------------------------------------------------------
    # Monthly / yearly reports
    # ------------------------------------------------------------------
    def monthly_report(self, date_from: datetime, date_to: datetime) -> ReportResponse[MonthlyReportRow]:
        self._validate_range(date_from, date_to)
        rows = self.db.execute(
            text(
                f"""
                SELECT to_char(o.order_date, 'YYYY-MM') AS month,
                       COUNT(DISTINCT o.id) AS order_count,
                       COALESCE(SUM(oi.quantity), 0) AS units_sold,
                       COALESCE(SUM(o.total_amount), 0) AS revenue,
                       COALESCE(SUM(oi.quantity * p.cost_price), 0) AS cogs,
                       COALESCE(SUM(o.tax_amount), 0) AS tax_total
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                LEFT JOIN products p ON p.id = oi.product_id
                WHERE {_EXCLUDED_CLAUSE} AND o.order_date >= :date_from AND o.order_date <= :date_to
                GROUP BY month
                ORDER BY month
                """
            ),
            {"date_from": date_from, "date_to": date_to, "ex1": _EXCLUDED_STATUSES[0], "ex2": _EXCLUDED_STATUSES[1]},
        ).all()

        new_customers = self.db.execute(
            text(
                """
                SELECT to_char(created_at, 'YYYY-MM') AS month, COUNT(*) AS count
                FROM customers
                WHERE is_deleted = false AND created_at >= :date_from AND created_at <= :date_to
                GROUP BY month
                """
            ),
            {"date_from": date_from, "date_to": date_to},
        ).all()
        new_map = {row.month: int(row.count) for row in new_customers}

        report_rows = []
        for r in rows:
            revenue = Decimal(str(r.revenue))
            cogs = Decimal(str(r.cogs))
            profit = revenue - cogs
            margin_pct = (profit / revenue * 100) if revenue else Decimal("0")
            report_rows.append(
                MonthlyReportRow(
                    month=r.month,
                    order_count=int(r.order_count),
                    units_sold=Decimal(str(r.units_sold)),
                    revenue=revenue,
                    cogs=cogs,
                    profit=profit,
                    margin_pct=Decimal(str(round(margin_pct, 2))),
                    new_customers=new_map.get(r.month, 0),
                )
            )
        summary = {
            "months": len(report_rows),
            "total_revenue": sum((r.revenue for r in report_rows), Decimal("0")),
            "total_profit": sum((r.profit for r in report_rows), Decimal("0")),
        }
        return ReportResponse[MonthlyReportRow](
            rows=report_rows,
            summary=summary,
            filters={"type": "monthly", "date_from": date_from.isoformat(), "date_to": date_to.isoformat()},
        )

    def yearly_report(self) -> ReportResponse[YearlyReportRow]:
        rows = self.db.execute(
            text(
                f"""
                SELECT EXTRACT(YEAR FROM o.order_date)::int AS year,
                       COUNT(DISTINCT o.id) AS order_count,
                       COALESCE(SUM(o.total_amount), 0) AS revenue,
                       COALESCE(SUM(oi.quantity * p.cost_price), 0) AS cogs,
                       COALESCE(SUM(o.tax_amount), 0) AS tax_total,
                       COUNT(DISTINCT o.customer_id) AS active_customers
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                LEFT JOIN products p ON p.id = oi.product_id
                WHERE {_EXCLUDED_CLAUSE}
                GROUP BY year
                ORDER BY year
                """
            ),
            {"ex1": _EXCLUDED_STATUSES[0], "ex2": _EXCLUDED_STATUSES[1]},
        ).all()
        report_rows = []
        for r in rows:
            revenue = Decimal(str(r.revenue))
            cogs = Decimal(str(r.cogs))
            profit = revenue - cogs
            margin_pct = (profit / revenue * 100) if revenue else Decimal("0")
            report_rows.append(
                YearlyReportRow(
                    year=int(r.year),
                    order_count=int(r.order_count),
                    revenue=revenue,
                    cogs=cogs,
                    profit=profit,
                    margin_pct=Decimal(str(round(margin_pct, 2))),
                    active_customers=int(r.active_customers or 0),
                )
            )
        summary = {
            "years": len(report_rows),
            "total_revenue": sum((r.revenue for r in report_rows), Decimal("0")),
            "total_profit": sum((r.profit for r in report_rows), Decimal("0")),
        }
        return ReportResponse[YearlyReportRow](
            rows=report_rows,
            summary=summary,
            filters={"type": "yearly"},
        )

    # ------------------------------------------------------------------
    # Commerce overview (cached in Redis)
    # ------------------------------------------------------------------
    def commerce_overview(self) -> Dict[str, Any]:
        try:
            redis = get_redis()
            cached = redis.get(CACHE_OVERVIEW_KEY)
            if cached:
                import json

                return json.loads(cached)
        except Exception:  # noqa: BLE001 - cache is best-effort
            pass

        row = self.db.execute(
            text(
                f"""
                SELECT COUNT(*) AS total_orders,
                       COALESCE(SUM(o.total_amount), 0) AS revenue,
                       COALESCE(SUM(oi.quantity * p.cost_price), 0) AS cogs,
                       COALESCE(SUM(o.tax_amount), 0) AS tax
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                LEFT JOIN products p ON p.id = oi.product_id
                WHERE {_EXCLUDED_CLAUSE}
                """
            ),
            {"ex1": _EXCLUDED_STATUSES[0], "ex2": _EXCLUDED_STATUSES[1]},
        ).one()

        customer_count = self.db.scalar(
            text("SELECT COUNT(*) FROM customers WHERE is_deleted = false")
        ) or 0
        product_count = self.db.scalar(
            text("SELECT COUNT(*) FROM products WHERE is_deleted = false")
        ) or 0
        revenue = Decimal(str(row.revenue))
        cogs = Decimal(str(row.cogs))
        tax = Decimal(str(row.tax))
        gross_profit = revenue - cogs

        result = {
            "total_orders": int(row.total_orders),
            "revenue": str(revenue),
            "cogs": str(cogs),
            "gross_profit": str(gross_profit),
            "net_profit": str(gross_profit - tax),
            "total_customers": int(customer_count),
            "total_products": int(product_count),
            "avg_order_value": str(round(revenue / row.total_orders, 2)) if row.total_orders else "0",
        }

        try:
            import json

            get_redis().setex(CACHE_OVERVIEW_KEY, CACHE_STATISTICS_TTL_SECONDS, json.dumps(result))
        except Exception:  # noqa: BLE001
            pass
        return result

    def invalidate_overview_cache(self) -> None:
        try:
            get_redis().delete(CACHE_OVERVIEW_KEY)
        except Exception:  # noqa: BLE001
            pass

    @staticmethod
    def _validate_range(date_from: datetime, date_to: datetime) -> None:
        if date_from > date_to:
            raise BadRequestError("date_from cannot be after date_to.")
