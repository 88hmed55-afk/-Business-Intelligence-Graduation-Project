from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query

from app.application.schemas.bi import (
    AggregationResponse,
    ComparisonResponse,
    ExecutiveOverview,
    ForecastResponse,
    InsightsResponse,
    RankingResponse,
    TrendResponse,
)
from app.application.schemas.common import ApiResponse
from app.application.services.bi_service import BIService
from app.domain.entities.user import User
from app.presentation.deps import get_bi_service, get_current_user

router = APIRouter(prefix="/bi", tags=["Business Intelligence"])

DEFAULT_START = date(2024, 1, 1)
DEFAULT_END = date.today()

Metric = Literal["revenue", "orders", "profit", "customers"]
Granularity = Literal["daily", "monthly", "quarterly"]
Dimension = Literal["category", "status", "warehouse", "country", "payment_method"]
RankingDimension = Literal["products", "customers", "employees", "suppliers", "categories"]


@router.get(
    "/overview",
    response_model=ApiResponse[ExecutiveOverview],
    summary="Executive dashboard overview",
)
def executive_overview(
    date_from: date = Query(default=DEFAULT_START),
    date_to: date = Query(default=DEFAULT_END),
    current_user: User = Depends(get_current_user),
    service: BIService = Depends(get_bi_service),
) -> ApiResponse[ExecutiveOverview]:
    return ApiResponse(data=service.executive_overview(date_from, date_to))


@router.get(
    "/forecast",
    response_model=ApiResponse[ForecastResponse],
    summary="Forecast a metric",
)
def forecast(
    metric: Metric = Query("revenue"),
    periods: int = Query(6, ge=1, le=24),
    date_from: date = Query(default=DEFAULT_START),
    date_to: date = Query(default=DEFAULT_END),
    current_user: User = Depends(get_current_user),
    service: BIService = Depends(get_bi_service),
) -> ApiResponse[ForecastResponse]:
    return ApiResponse(data=service.forecast(metric, periods, date_from, date_to))


@router.get(
    "/compare",
    response_model=ApiResponse[ComparisonResponse],
    summary="Compare current vs previous period",
)
def compare(
    date_from: date = Query(default=DEFAULT_START),
    date_to: date = Query(default=DEFAULT_END),
    current_user: User = Depends(get_current_user),
    service: BIService = Depends(get_bi_service),
) -> ApiResponse[ComparisonResponse]:
    return ApiResponse(data=service.compare(date_from, date_to))


@router.get(
    "/insights",
    response_model=ApiResponse[InsightsResponse],
    summary="Generate business insights",
)
def insights(
    date_from: date = Query(default=DEFAULT_START),
    date_to: date = Query(default=DEFAULT_END),
    current_user: User = Depends(get_current_user),
    service: BIService = Depends(get_bi_service),
) -> ApiResponse[InsightsResponse]:
    return ApiResponse(data=service.generate_insights(date_from, date_to))


@router.get(
    "/aggregate",
    response_model=ApiResponse[AggregationResponse],
    summary="Aggregate data by dimension",
)
def aggregate(
    dimension: Dimension = Query("category"),
    date_from: date = Query(default=DEFAULT_START),
    date_to: date = Query(default=DEFAULT_END),
    current_user: User = Depends(get_current_user),
    service: BIService = Depends(get_bi_service),
) -> ApiResponse[AggregationResponse]:
    return ApiResponse(data=service.aggregate(dimension, date_from, date_to))


@router.get(
    "/rankings",
    response_model=ApiResponse[RankingResponse],
    summary="Get rankings",
)
def rankings(
    dimension: RankingDimension = Query("products"),
    date_from: date = Query(default=DEFAULT_START),
    date_to: date = Query(default=DEFAULT_END),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    service: BIService = Depends(get_bi_service),
) -> ApiResponse[RankingResponse]:
    return ApiResponse(data=service.rankings(dimension, date_from, date_to, limit))


@router.get(
    "/trend",
    response_model=ApiResponse[TrendResponse],
    summary="Get trend data",
)
def trend(
    metric: Metric = Query("revenue"),
    granularity: Granularity = Query("monthly"),
    date_from: date = Query(default=DEFAULT_START),
    date_to: date = Query(default=DEFAULT_END),
    current_user: User = Depends(get_current_user),
    service: BIService = Depends(get_bi_service),
) -> ApiResponse[TrendResponse]:
    return ApiResponse(data=service.trend(metric, granularity, date_from, date_to))
