from datetime import date

from fastapi import APIRouter, Depends, Query

from app.application.schemas.common import ApiResponse
from app.application.services.statistics_service import StatisticsService
from app.domain.entities.user import User
from app.presentation.deps import get_current_user, get_statistics_service, require_admin

router = APIRouter(prefix="/statistics", tags=["Statistics"])


@router.get(
    "",
    response_model=ApiResponse[dict],
    summary="Daily statistics snapshots",
)
def statistics(
    date_from: date = Query(...),
    date_to: date = Query(...),
    current_user: User = Depends(get_current_user),
    service: StatisticsService = Depends(get_statistics_service),
) -> ApiResponse[dict]:
    snapshots = service.snapshot(date_from, date_to)
    grouped: dict[str, dict] = {}
    for snapshot in snapshots:
        grouped.setdefault(snapshot["period"], {})[snapshot["metric_key"]] = snapshot["value"]
    return ApiResponse(data={"snapshots": grouped, "days": len(grouped)})


@router.post(
    "/refresh",
    response_model=ApiResponse[dict],
    summary="Refresh today's statistics (admin)",
)
def refresh_statistics(
    current_user: User = Depends(require_admin),
    service: StatisticsService = Depends(get_statistics_service),
) -> ApiResponse[dict]:
    metrics = service.refresh_today()
    return ApiResponse(data={"updated": True, "metrics": metrics}, message="Statistics refreshed")
