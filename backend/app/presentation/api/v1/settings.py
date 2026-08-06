import uuid

from fastapi import APIRouter, Depends, Query

from app.application.schemas.common import ApiResponse, MessageResponse, PaginatedResponse
from app.application.schemas.setting import SettingCreate, SettingOut, SettingUpdate
from app.application.services.setting_service import SettingService
from app.domain.entities.user import User
from app.presentation.deps import get_current_user, get_setting_service, require_permission
from app.shared.utils.response import paginate

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[SettingOut]],
    summary="List settings",
)
def list_settings(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str | None = Query(None, max_length=100),
    group_name: str | None = Query(None, max_length=100),
    current_user: User = Depends(get_current_user),
    service: SettingService = Depends(get_setting_service),
) -> ApiResponse[PaginatedResponse[SettingOut]]:
    settings, total = service.list(page, page_size, search, group_name)
    return ApiResponse(data=paginate([SettingOut.model_validate(s) for s in settings], total, page, page_size))


@router.post(
    "",
    response_model=ApiResponse[SettingOut],
    status_code=201,
    summary="Create setting",
)
def create_setting(
    payload: SettingCreate,
    current_user: User = Depends(require_permission("settings", "create")),
    service: SettingService = Depends(get_setting_service),
) -> ApiResponse[SettingOut]:
    setting = service.create(payload)
    return ApiResponse(data=SettingOut.model_validate(setting), message="Setting created")


@router.get(
    "/by-key/{key}",
    response_model=ApiResponse[SettingOut],
    summary="Get setting by key",
)
def get_setting_by_key(
    key: str,
    current_user: User = Depends(get_current_user),
    service: SettingService = Depends(get_setting_service),
) -> ApiResponse[SettingOut]:
    return ApiResponse(data=SettingOut.model_validate(service.get_by_key(key)))


@router.get(
    "/{setting_id}",
    response_model=ApiResponse[SettingOut],
    summary="Get setting",
)
def get_setting(
    setting_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: SettingService = Depends(get_setting_service),
) -> ApiResponse[SettingOut]:
    return ApiResponse(data=SettingOut.model_validate(service.get(setting_id)))


@router.patch(
    "/{setting_id}",
    response_model=ApiResponse[SettingOut],
    summary="Update setting",
)
def update_setting(
    setting_id: uuid.UUID,
    payload: SettingUpdate,
    current_user: User = Depends(require_permission("settings", "update")),
    service: SettingService = Depends(get_setting_service),
) -> ApiResponse[SettingOut]:
    setting = service.update(setting_id, payload)
    return ApiResponse(data=SettingOut.model_validate(setting), message="Setting updated")


@router.delete(
    "/{setting_id}",
    response_model=MessageResponse,
    summary="Delete setting",
)
def delete_setting(
    setting_id: uuid.UUID,
    current_user: User = Depends(require_permission("settings", "delete")),
    service: SettingService = Depends(get_setting_service),
) -> MessageResponse:
    service.delete(setting_id)
    return MessageResponse(message="Setting deleted")
