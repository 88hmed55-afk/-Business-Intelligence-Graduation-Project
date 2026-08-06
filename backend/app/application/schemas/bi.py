from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ForecastPoint(BaseModel):
    period: str
    actual: Optional[float] = None
    predicted: float
    lower_bound: float
    upper_bound: float


class ForecastResponse(BaseModel):
    metric: str
    points: List[ForecastPoint]
    trend: str = "stable"
    growth_pct: float = 0.0
    confidence: float = 0.85


class ComparisonPeriod(BaseModel):
    label: str
    revenue: float = 0.0
    orders: int = 0
    profit: float = 0.0
    customers: int = 0
    avg_order_value: float = 0.0
    units_sold: int = 0


class ComparisonResponse(BaseModel):
    current: ComparisonPeriod
    previous: ComparisonPeriod
    changes: Dict[str, float] = Field(default_factory=dict)


class InsightItem(BaseModel):
    id: str
    type: str
    severity: str
    title: str
    description: str
    metric: Optional[str] = None
    change_pct: Optional[float] = None
    period: Optional[str] = None


class InsightsResponse(BaseModel):
    insights: List[InsightItem]
    generated_at: str = ""


class AggregationBucket(BaseModel):
    label: str
    value: float
    count: int = 0
    percentage: float = 0.0


class AggregationResponse(BaseModel):
    dimension: str
    buckets: List[AggregationBucket]
    total: float = 0.0


class RankingItem(BaseModel):
    rank: int
    id: Optional[str] = None
    name: str
    value: float
    secondary_value: Optional[float] = None
    change_pct: Optional[float] = None


class RankingResponse(BaseModel):
    dimension: str
    items: List[RankingItem]
    period: Optional[str] = None


class TrendDataPoint(BaseModel):
    period: str
    value: float
    cumulative: float = 0.0


class TrendResponse(BaseModel):
    metric: str
    granularity: str
    points: List[TrendDataPoint]
    total: float = 0.0
    average: float = 0.0
    min_value: float = 0.0
    max_value: float = 0.0


class KPIDetail(BaseModel):
    key: str
    label: str
    value: float
    previous_value: Optional[float] = None
    change_pct: Optional[float] = None
    trend: str = "flat"
    format: str = "number"
    icon: Optional[str] = None


class ExecutiveOverview(BaseModel):
    kpis: List[KPIDetail]
    revenue_chart: List[Dict[str, Any]]
    profit_chart: List[Dict[str, Any]]
    order_status: Dict[str, int]
    top_products: List[Dict[str, Any]]
    top_customers: List[Dict[str, Any]]
    category_split: List[Dict[str, Any]]
    monthly_trend: List[Dict[str, Any]]
