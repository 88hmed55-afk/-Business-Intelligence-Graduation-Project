from fastapi import APIRouter, Depends, Query

from app.application.schemas.analytics import (
    AnalyticsOverview,
    DashboardSummaryItem,
    PerformanceItem,
    TrendPoint,
)
from app.application.schemas.common import ApiResponse
from app.application.services.analytics_service import AnalyticsService
from app.presentation.deps import get_analytics_service, get_current_user

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
    dependencies=[Depends(get_current_user)],
)


@router.get(
    "/overview",
    response_model=ApiResponse[AnalyticsOverview],
    summary="Analytics overview",
)
def overview(service: AnalyticsService = Depends(get_analytics_service)) -> ApiResponse[AnalyticsOverview]:
    return ApiResponse(data=service.overview(), message="Overview retrieved")


@router.get(
    "/trends",
    response_model=ApiResponse[list[TrendPoint]],
    summary="KPI achievement trend",
)
def trends(
    limit: int = Query(12, ge=1, le=36),
    service: AnalyticsService = Depends(get_analytics_service),
) -> ApiResponse[list[TrendPoint]]:
    return ApiResponse(data=service.trends(limit), message="Trends retrieved")


@router.get(
    "/performance",
    response_model=ApiResponse[list[PerformanceItem]],
    summary="Latest KPI performance",
)
def performance(
    limit: int = Query(10, ge=1, le=50),
    service: AnalyticsService = Depends(get_analytics_service),
) -> ApiResponse[list[PerformanceItem]]:
    return ApiResponse(data=service.performance(limit), message="Performance retrieved")


@router.get(
    "/dashboard-summary",
    response_model=ApiResponse[list[DashboardSummaryItem]],
    summary="Dashboard summaries",
)
def dashboard_summary(
    limit: int = Query(10, ge=1, le=50),
    service: AnalyticsService = Depends(get_analytics_service),
) -> ApiResponse[list[DashboardSummaryItem]]:
    return ApiResponse(data=service.dashboard_summary(limit), message="Summaries retrieved")
