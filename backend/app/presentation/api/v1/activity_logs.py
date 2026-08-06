import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query

from app.application.schemas.activity_log import ActivityLogOut
from app.application.schemas.common import ApiResponse, PaginatedResponse
from app.application.services.activity_log_service import ActivityLogService
from app.domain.entities.user import User
from app.presentation.deps import get_activity_log_service, get_current_user, require_admin
from app.shared.enums import ActivityAction
from app.shared.utils.response import paginate

router = APIRouter(prefix="/activity-logs", tags=["Activity Logs"])


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[ActivityLogOut]],
    summary="List activity logs",
)
def list_activity_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: uuid.UUID | None = Query(None),
    module: str | None = Query(None, max_length=100),
    action: ActivityAction | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    current_user: User = Depends(require_admin),
    service: ActivityLogService = Depends(get_activity_log_service),
) -> ApiResponse[PaginatedResponse[ActivityLogOut]]:
    logs, total = service.list(
        page,
        page_size,
        user_id,
        module,
        action.value if action else None,
        date_from,
        date_to,
    )
    return ApiResponse(data=paginate([ActivityLogOut.model_validate(log) for log in logs], total, page, page_size))


@router.get(
    "/{log_id}",
    response_model=ApiResponse[ActivityLogOut],
    summary="Get activity log",
)
def get_activity_log(
    log_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    service: ActivityLogService = Depends(get_activity_log_service),
) -> ApiResponse[ActivityLogOut]:
    return ApiResponse(data=ActivityLogOut.model_validate(service.get(log_id)))
