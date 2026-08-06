import uuid

from fastapi import APIRouter, Depends, Query

from app.application.schemas.common import ApiResponse, PaginatedResponse
from app.application.schemas.notification import NotificationCreate, NotificationOut
from app.application.services.notification_service import NotificationService
from app.domain.entities.user import User
from app.presentation.deps import get_current_user, get_notification_service
from app.shared.utils.response import paginate

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[NotificationOut]],
    summary="List my notifications",
)
def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_read: bool | None = Query(None),
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
) -> ApiResponse[PaginatedResponse[NotificationOut]]:
    notifications, total = service.list(page, page_size, current_user.id, is_read)
    return ApiResponse(
        data=paginate([NotificationOut.model_validate(n) for n in notifications], total, page, page_size)
    )


@router.post(
    "",
    response_model=ApiResponse[NotificationOut],
    status_code=201,
    summary="Create notification",
)
def create_notification(
    payload: NotificationCreate,
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
) -> ApiResponse[NotificationOut]:
    notification = service.create(current_user.id, payload)
    return ApiResponse(data=NotificationOut.model_validate(notification), message="Notification created")


@router.get(
    "/unread-count",
    response_model=ApiResponse[dict],
    summary="Unread notification count",
)
def unread_count(
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
) -> ApiResponse[dict]:
    return ApiResponse(data={"count": service.count_unread(current_user.id)})


@router.post(
    "/read-all",
    response_model=ApiResponse[dict],
    summary="Mark all notifications as read",
)
def mark_all_read(
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
) -> ApiResponse[dict]:
    marked = service.mark_all_read(current_user.id)
    return ApiResponse(data={"marked": marked}, message="All notifications marked as read")


@router.get(
    "/{notification_id}",
    response_model=ApiResponse[NotificationOut],
    summary="Get notification",
)
def get_notification(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
) -> ApiResponse[NotificationOut]:
    return ApiResponse(data=NotificationOut.model_validate(service.get_for_user(notification_id, current_user.id)))


@router.patch(
    "/{notification_id}/read",
    response_model=ApiResponse[NotificationOut],
    summary="Mark notification as read",
)
def mark_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
) -> ApiResponse[NotificationOut]:
    notification = service.mark_read(notification_id, current_user.id)
    return ApiResponse(data=NotificationOut.model_validate(notification), message="Notification marked as read")
