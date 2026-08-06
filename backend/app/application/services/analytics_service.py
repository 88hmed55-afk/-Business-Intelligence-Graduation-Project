from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.application.schemas.analytics import (
    AnalyticsOverview,
    CategoryBreakdown,
    DashboardSummaryItem,
    MetricValue,
    PerformanceItem,
    TrendPoint,
)
from app.domain.repositories.dashboard_repository import DashboardRepository
from app.domain.repositories.kpi_repository import KpiRepository
from app.domain.repositories.report_repository import ReportRepository
from app.domain.repositories.user_repository import UserRepository
from app.shared.utils.helpers import safe_round


class AnalyticsService:
    def __init__(
        self,
        db: Session,
        user_repo: UserRepository,
        dashboard_repo: DashboardRepository,
        report_repo: ReportRepository,
        kpi_repo: KpiRepository,
    ) -> None:
        self.db = db
        self.user_repo = user_repo
        self.dashboard_repo = dashboard_repo
        self.report_repo = report_repo
        self.kpi_repo = kpi_repo

    def _scalar(self, sql: str, params: Optional[dict] = None) -> object:
        return self.db.execute(text(sql), params or {}).scalar()

    def _trends(self, limit: int = 12) -> list[TrendPoint]:
        rows = self.db.execute(
            text(
                """
                SELECT to_char(period, 'YYYY-MM') AS period,
                       ROUND(AVG(achievement_pct), 1) AS value,
                       COUNT(*) AS kpis
                FROM kpi_performance_v
                GROUP BY period
                ORDER BY period
                LIMIT :limit
                """
            ),
            {"limit": limit},
        ).all()
        return [
            TrendPoint(period=r.period, value=safe_round(r.value), kpis=int(r.kpis)) for r in rows
        ]

    def overview(self) -> AnalyticsOverview:
        total_users = self.user_repo.count()
        active_users = self.user_repo.count_active()
        total_dashboards = self.dashboard_repo.count()
        total_reports = self.report_repo.count()
        total_kpis = self.kpi_repo.count()

        avg_achievement = self._scalar(
            "SELECT ROUND(AVG(CASE WHEN target_value > 0 THEN (current_value / target_value) * 100 END), 1) "
            "FROM kpis WHERE target_value > 0"
        )
        published_reports = self.report_repo.count_by_status("published")
        published_pct = round(published_reports / total_reports * 100, 1) if total_reports else 0

        metrics = [
            MetricValue(label="Total Users", value=float(total_users)),
            MetricValue(label="Active Users", value=float(active_users)),
            MetricValue(label="Dashboards", value=float(total_dashboards)),
            MetricValue(label="Reports", value=float(total_reports)),
            MetricValue(label="KPIs Tracked", value=float(total_kpis)),
            MetricValue(
                label="Avg Achievement",
                value=safe_round(avg_achievement),
                delta=published_pct,
                delta_percent=published_pct,
            ),
        ]

        categories = [
            CategoryBreakdown(
                category=r["category"],
                total=r["total"],
                avg_current=r["avg_current"],
                achievement=r["achievement"],
            )
            for r in self.kpi_repo.aggregate_by_category()
        ]

        return AnalyticsOverview(metrics=metrics, categories=categories, trends=self._trends(12))

    def trends(self, limit: int = 12) -> list[TrendPoint]:
        return self._trends(limit=limit)

    def performance(self, limit: int = 10) -> list[PerformanceItem]:
        rows = self.db.execute(
            text(
                """
                SELECT kpi_id, kpi_name, category, target_value, current_value, unit, trend,
                       achievement_pct, to_char(period, 'YYYY-MM-DD') AS period
                FROM kpi_performance_v
                ORDER BY updated_at DESC
                LIMIT :limit
                """
            ),
            {"limit": limit},
        ).all()
        return [
            PerformanceItem(
                kpi_id=r.kpi_id,
                kpi_name=r.kpi_name,
                category=r.category,
                target_value=float(r.target_value) if r.target_value is not None else None,
                current_value=float(r.current_value) if r.current_value is not None else None,
                unit=r.unit,
                trend=r.trend,
                achievement_pct=float(r.achievement_pct) if r.achievement_pct is not None else None,
                period=r.period,
            )
            for r in rows
        ]

    def dashboard_summary(self, limit: int = 10) -> list[DashboardSummaryItem]:
        rows = self.db.execute(
            text(
                """
                SELECT dashboard_id, dashboard_name, is_public, is_favorite, owner_email, kpi_count
                FROM dashboard_summary_v
                ORDER BY kpi_count DESC
                LIMIT :limit
                """
            ),
            {"limit": limit},
        ).all()
        return [
            DashboardSummaryItem(
                dashboard_id=r.dashboard_id,
                dashboard_name=r.dashboard_name,
                is_public=r.is_public,
                is_favorite=r.is_favorite,
                owner_email=r.owner_email,
                kpi_count=int(r.kpi_count),
            )
            for r in rows
        ]
