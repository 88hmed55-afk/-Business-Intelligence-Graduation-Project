import uuid

from fastapi import APIRouter, Depends, Query

from app.application.schemas.common import ApiResponse, MessageResponse, PaginatedResponse
from app.application.schemas.user import SelfUpdateRequest, UserCreate, UserOut, UserUpdate
from app.application.services.user_service import UserService
from app.domain.entities.user import User
from app.presentation.deps import get_current_user, get_user_service, require_admin
from app.shared.utils.response import paginate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me",
    response_model=ApiResponse[UserOut],
    summary="Current user profile",
)
def get_me(current_user: User = Depends(get_current_user)) -> ApiResponse[UserOut]:
    return ApiResponse(data=UserOut.model_validate(current_user), message="Current user")


@router.patch(
    "/me",
    response_model=ApiResponse[UserOut],
    summary="Update own profile",
)
def update_me(
    payload: SelfUpdateRequest,
    current_user: User = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> ApiResponse[UserOut]:
    updated = service.update_self(current_user, payload)
    return ApiResponse(data=UserOut.model_validate(updated), message="Profile updated")


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[UserOut]],
    summary="List users",
)
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    current_user: User = Depends(require_admin),
    service: UserService = Depends(get_user_service),
) -> ApiResponse[PaginatedResponse[UserOut]]:
    users, total = service.list(page, page_size, search)
    return ApiResponse(data=paginate([UserOut.model_validate(u) for u in users], total, page, page_size))


@router.post(
    "",
    response_model=ApiResponse[UserOut],
    status_code=201,
    summary="Create user",
)
def create_user(
    payload: UserCreate,
    current_user: User = Depends(require_admin),
    service: UserService = Depends(get_user_service),
) -> ApiResponse[UserOut]:
    user = service.create(payload)
    return ApiResponse(data=UserOut.model_validate(user), message="User created")


@router.get(
    "/{user_id}",
    response_model=ApiResponse[UserOut],
    summary="Get user by id",
)
def get_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    service: UserService = Depends(get_user_service),
) -> ApiResponse[UserOut]:
    user = service.get(user_id)
    return ApiResponse(data=UserOut.model_validate(user))


@router.patch(
    "/{user_id}",
    response_model=ApiResponse[UserOut],
    summary="Update user",
)
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    current_user: User = Depends(require_admin),
    service: UserService = Depends(get_user_service),
) -> ApiResponse[UserOut]:
    user = service.update(user_id, payload, current_user)
    return ApiResponse(data=UserOut.model_validate(user), message="User updated")


@router.delete(
    "/{user_id}",
    response_model=MessageResponse,
    summary="Delete user",
)
def delete_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_admin),
    service: UserService = Depends(get_user_service),
) -> MessageResponse:
    service.delete(user_id, current_user)
    return MessageResponse(message="User deleted")
