import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, Query

from app.application.schemas.common import ApiResponse, MessageResponse, PaginatedResponse
from app.application.schemas.kpi import KpiCreate, KpiOut, KpiUpdate, KpiValueUpdate
from app.application.services.kpi_service import KpiService
from app.domain.entities.user import User
from app.presentation.deps import get_current_user, get_kpi_service
from app.shared.enums import KpiCategory
from app.shared.utils.response import paginate

router = APIRouter(prefix="/kpis", tags=["KPIs"])


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[KpiOut]],
    summary="List KPIs",
)
def list_kpis(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    category: KpiCategory | None = Query(None),
    dashboard_id: uuid.UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    service: KpiService = Depends(get_kpi_service),
) -> ApiResponse[PaginatedResponse[KpiOut]]:
    items, total = service.list(
        current_user, page, page_size, search, category.value if category else None, dashboard_id
    )
    return ApiResponse(data=paginate(items, total, page, page_size))


@router.post(
    "",
    response_model=ApiResponse[KpiOut],
    status_code=201,
    summary="Create KPI",
)
def create_kpi(
    payload: KpiCreate,
    current_user: User = Depends(get_current_user),
    service: KpiService = Depends(get_kpi_service),
) -> ApiResponse[KpiOut]:
    kpi = service.create(payload, current_user)
    return ApiResponse(data=kpi, message="KPI created")


@router.get(
    "/{kpi_id}",
    response_model=ApiResponse[KpiOut],
    summary="Get KPI",
)
def get_kpi(
    kpi_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: KpiService = Depends(get_kpi_service),
) -> ApiResponse[KpiOut]:
    return ApiResponse(data=service.get(kpi_id, current_user))


@router.patch(
    "/{kpi_id}",
    response_model=ApiResponse[KpiOut],
    summary="Update KPI",
)
def update_kpi(
    kpi_id: uuid.UUID,
    payload: KpiUpdate,
    current_user: User = Depends(get_current_user),
    service: KpiService = Depends(get_kpi_service),
) -> ApiResponse[KpiOut]:
    kpi = service.update(kpi_id, payload, current_user)
    return ApiResponse(data=kpi, message="KPI updated")


@router.post(
    "/{kpi_id}/update-value",
    response_model=ApiResponse[KpiOut],
    summary="Record a KPI measurement",
)
def update_kpi_value(
    kpi_id: uuid.UUID,
    payload: KpiValueUpdate,
    current_user: User = Depends(get_current_user),
    service: KpiService = Depends(get_kpi_service),
) -> ApiResponse[KpiOut]:
    kpi = service.update_value(kpi_id, payload.current_value, current_user)
    return ApiResponse(data=kpi, message="KPI value recorded")


@router.delete(
    "/{kpi_id}",
    response_model=MessageResponse,
    summary="Delete KPI",
)
def delete_kpi(
    kpi_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: KpiService = Depends(get_kpi_service),
) -> MessageResponse:
    service.delete(kpi_id, current_user)
    return MessageResponse(message="KPI deleted")
