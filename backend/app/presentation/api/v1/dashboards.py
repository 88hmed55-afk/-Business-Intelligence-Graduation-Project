import uuid

from fastapi import APIRouter, Depends, Query

from app.application.schemas.common import ApiResponse, MessageResponse, PaginatedResponse
from app.application.schemas.dashboard import DashboardCreate, DashboardOut, DashboardUpdate
from app.application.services.dashboard_service import DashboardService
from app.domain.entities.user import User
from app.presentation.deps import get_current_user, get_dashboard_service
from app.shared.utils.response import paginate

router = APIRouter(prefix="/dashboards", tags=["Dashboards"])


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[DashboardOut]],
    summary="List dashboards",
)
def list_dashboards(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    is_favorite: bool | None = Query(None),
    current_user: User = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
) -> ApiResponse[PaginatedResponse[DashboardOut]]:
    items, total = service.list(current_user, page, page_size, search, is_favorite)
    return ApiResponse(data=paginate(items, total, page, page_size))


@router.post(
    "",
    response_model=ApiResponse[DashboardOut],
    status_code=201,
    summary="Create dashboard",
)
def create_dashboard(
    payload: DashboardCreate,
    current_user: User = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
) -> ApiResponse[DashboardOut]:
    dashboard = service.create(payload, current_user)
    return ApiResponse(data=dashboard, message="Dashboard created")


@router.get(
    "/{dashboard_id}",
    response_model=ApiResponse[DashboardOut],
    summary="Get dashboard",
)
def get_dashboard(
    dashboard_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
) -> ApiResponse[DashboardOut]:
    return ApiResponse(data=service.get(dashboard_id, current_user))


@router.patch(
    "/{dashboard_id}",
    response_model=ApiResponse[DashboardOut],
    summary="Update dashboard",
)
def update_dashboard(
    dashboard_id: uuid.UUID,
    payload: DashboardUpdate,
    current_user: User = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
) -> ApiResponse[DashboardOut]:
    dashboard = service.update(dashboard_id, payload, current_user)
    return ApiResponse(data=dashboard, message="Dashboard updated")


@router.post(
    "/{dashboard_id}/favorite",
    response_model=ApiResponse[DashboardOut],
    summary="Toggle favorite",
)
def toggle_favorite(
    dashboard_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
) -> ApiResponse[DashboardOut]:
    dashboard = service.toggle_favorite(dashboard_id, current_user)
    return ApiResponse(data=dashboard, message="Favorite toggled")


@router.delete(
    "/{dashboard_id}",
    response_model=MessageResponse,
    summary="Delete dashboard",
)
def delete_dashboard(
    dashboard_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: DashboardService = Depends(get_dashboard_service),
) -> MessageResponse:
    service.delete(dashboard_id, current_user)
    return MessageResponse(message="Dashboard deleted")
