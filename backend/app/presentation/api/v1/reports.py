import uuid

from fastapi import APIRouter, Depends, Query

from app.application.schemas.common import ApiResponse, MessageResponse, PaginatedResponse
from app.application.schemas.report import ReportCreate, ReportOut, ReportUpdate
from app.application.services.report_service import ReportService
from app.domain.entities.user import User
from app.presentation.deps import get_current_user, get_report_service
from app.shared.enums import ReportStatus
from app.shared.utils.response import paginate

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[ReportOut]],
    summary="List reports",
)
def list_reports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    status: ReportStatus | None = Query(None),
    current_user: User = Depends(get_current_user),
    service: ReportService = Depends(get_report_service),
) -> ApiResponse[PaginatedResponse[ReportOut]]:
    reports, total = service.list(current_user, page, page_size, search, status.value if status else None)
    return ApiResponse(data=paginate([ReportOut.model_validate(r) for r in reports], total, page, page_size))


@router.post(
    "",
    response_model=ApiResponse[ReportOut],
    status_code=201,
    summary="Create report",
)
def create_report(
    payload: ReportCreate,
    current_user: User = Depends(get_current_user),
    service: ReportService = Depends(get_report_service),
) -> ApiResponse[ReportOut]:
    report = service.create(payload, current_user)
    return ApiResponse(data=ReportOut.model_validate(report), message="Report created")


@router.get(
    "/{report_id}",
    response_model=ApiResponse[ReportOut],
    summary="Get report",
)
def get_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: ReportService = Depends(get_report_service),
) -> ApiResponse[ReportOut]:
    return ApiResponse(data=ReportOut.model_validate(service.get(report_id, current_user)))


@router.patch(
    "/{report_id}",
    response_model=ApiResponse[ReportOut],
    summary="Update report",
)
def update_report(
    report_id: uuid.UUID,
    payload: ReportUpdate,
    current_user: User = Depends(get_current_user),
    service: ReportService = Depends(get_report_service),
) -> ApiResponse[ReportOut]:
    report = service.update(report_id, payload, current_user)
    return ApiResponse(data=ReportOut.model_validate(report), message="Report updated")


@router.post(
    "/{report_id}/publish",
    response_model=ApiResponse[ReportOut],
    summary="Publish report",
)
def publish_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: ReportService = Depends(get_report_service),
) -> ApiResponse[ReportOut]:
    report = service.change_status(report_id, ReportStatus.PUBLISHED.value, current_user)
    return ApiResponse(data=ReportOut.model_validate(report), message="Report published")


@router.post(
    "/{report_id}/archive",
    response_model=ApiResponse[ReportOut],
    summary="Archive report",
)
def archive_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: ReportService = Depends(get_report_service),
) -> ApiResponse[ReportOut]:
    report = service.change_status(report_id, ReportStatus.ARCHIVED.value, current_user)
    return ApiResponse(data=ReportOut.model_validate(report), message="Report archived")


@router.delete(
    "/{report_id}",
    response_model=MessageResponse,
    summary="Delete report",
)
def delete_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: ReportService = Depends(get_report_service),
) -> MessageResponse:
    service.delete(report_id, current_user)
    return MessageResponse(message="Report deleted")
