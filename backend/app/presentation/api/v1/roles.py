import uuid

from fastapi import APIRouter, Depends, Query

from app.application.schemas.common import ApiResponse, MessageResponse, PaginatedResponse
from app.application.schemas.role import (
    PermissionOut,
    RoleCreate,
    RoleDetail,
    RoleOut,
    RolePermissionAssign,
    RoleUpdate,
)
from app.application.services.role_service import PermissionService, RoleService
from app.domain.entities.user import User
from app.presentation.deps import (
    get_current_user,
    get_permission_service,
    get_role_service,
    require_admin,
)
from app.shared.utils.response import paginate

router = APIRouter(prefix="/roles", tags=["Roles & Permissions"])


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[RoleOut]],
    summary="List roles",
)
def list_roles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    current_user: User = Depends(require_admin),
    service: RoleService = Depends(get_role_service),
) -> ApiResponse[PaginatedResponse[RoleOut]]:
    roles, total = service.list(page, page_size, search)
    return ApiResponse(data=paginate([RoleOut.model_validate(r) for r in roles], total, page, page_size))


@router.post(
    "",
    response_model=ApiResponse[RoleOut],
    status_code=201,
    summary="Create role",
)
def create_role(
    payload: RoleCreate,
    current_user: User = Depends(require_admin),
    service: RoleService = Depends(get_role_service),
) -> ApiResponse[RoleOut]:
    role = service.create(payload)
    return ApiResponse(data=RoleOut.model_validate(role), message="Role created")


@router.get(
    "/{role_id}",
    response_model=ApiResponse[RoleDetail],
    summary="Get role with permissions",
)
def get_role(
    role_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    service: RoleService = Depends(get_role_service),
) -> ApiResponse[RoleDetail]:
    role, permissions = service.get_detail(role_id)
    detail = RoleDetail.model_validate(role)
    detail.permissions = [PermissionOut.model_validate(p) for p in permissions]
    return ApiResponse(data=detail)


@router.patch(
    "/{role_id}",
    response_model=ApiResponse[RoleOut],
    summary="Update role",
)
def update_role(
    role_id: uuid.UUID,
    payload: RoleUpdate,
    current_user: User = Depends(require_admin),
    service: RoleService = Depends(get_role_service),
) -> ApiResponse[RoleOut]:
    role = service.update(role_id, payload)
    return ApiResponse(data=RoleOut.model_validate(role), message="Role updated")


@router.post(
    "/{role_id}/permissions",
    response_model=ApiResponse[RoleDetail],
    summary="Assign permissions to role",
)
def assign_permissions(
    role_id: uuid.UUID,
    payload: RolePermissionAssign,
    current_user: User = Depends(require_admin),
    service: RoleService = Depends(get_role_service),
    permission_service: PermissionService = Depends(get_permission_service),
) -> ApiResponse[RoleDetail]:
    service.assign_permissions(role_id, payload.permission_ids)
    permission_service.invalidate(service.get(role_id).name)
    role, permissions = service.get_detail(role_id)
    detail = RoleDetail.model_validate(role)
    detail.permissions = [PermissionOut.model_validate(p) for p in permissions]
    return ApiResponse(data=detail, message="Permissions assigned")


@router.delete(
    "/{role_id}",
    response_model=MessageResponse,
    summary="Delete role",
)
def delete_role(
    role_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    service: RoleService = Depends(get_role_service),
) -> MessageResponse:
    service.delete(role_id)
    return MessageResponse(message="Role deleted")


permissions_router = APIRouter(prefix="/permissions", tags=["Roles & Permissions"])


@permissions_router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[PermissionOut]],
    summary="List permissions",
)
def list_permissions(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=500),
    search: str | None = Query(None, max_length=100),
    module: str | None = Query(None, max_length=100),
    current_user: User = Depends(get_current_user),
    service: PermissionService = Depends(get_permission_service),
) -> ApiResponse[PaginatedResponse[PermissionOut]]:
    permissions, total = service.list(page, page_size, search, module)
    return ApiResponse(data=paginate([PermissionOut.model_validate(p) for p in permissions], total, page, page_size))
