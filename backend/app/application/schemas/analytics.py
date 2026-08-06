import uuid
from typing import Optional

from pydantic import BaseModel, Field


class MetricValue(BaseModel):
    label: str
    value: float
    delta: float | None = None
    delta_percent: float | None = None


class CategoryBreakdown(BaseModel):
    category: str
    total: int
    avg_current: float
    achievement: float


class TrendPoint(BaseModel):
    period: str
    value: float
    kpis: int = 0


class PerformanceItem(BaseModel):
    kpi_id: uuid.UUID
    kpi_name: str
    category: str
    target_value: float | None = None
    current_value: float | None = None
    unit: str | None = None
    trend: str
    achievement_pct: float | None = None
    period: str | None = None


class DashboardSummaryItem(BaseModel):
    dashboard_id: uuid.UUID
    dashboard_name: str
    is_public: bool
    is_favorite: bool
    owner_email: str
    kpi_count: int


class AnalyticsOverview(BaseModel):
    metrics: list[MetricValue]
    categories: list[CategoryBreakdown]
    trends: list[TrendPoint]


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    timestamp: str
    checks: dict[str, str] = Field(default_factory=dict)
