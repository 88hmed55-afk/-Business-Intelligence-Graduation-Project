from fastapi import APIRouter, Depends

from app.application.schemas.auth import LoginRequest, LogoutRequest, RefreshRequest, TokenResponse
from app.application.schemas.common import ApiResponse, MessageResponse
from app.application.schemas.user import ChangePasswordRequest, UserOut
from app.application.services.auth_service import AuthService
from app.domain.entities.user import User
from app.presentation.deps import get_auth_service, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/login",
    response_model=ApiResponse[TokenResponse],
    summary="Sign in",
)
def login(payload: LoginRequest, service: AuthService = Depends(get_auth_service)) -> ApiResponse[TokenResponse]:
    result = service.login(payload.email, payload.password)
    return ApiResponse(data=result, message="Login successful")


@router.post(
    "/refresh",
    response_model=ApiResponse[TokenResponse],
    summary="Refresh access token",
)
def refresh(payload: RefreshRequest, service: AuthService = Depends(get_auth_service)) -> ApiResponse[TokenResponse]:
    result = service.refresh(payload.refresh_token)
    return ApiResponse(data=result, message="Token refreshed")


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Revoke refresh token",
)
def logout(
    payload: LogoutRequest,
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    service.logout(payload.refresh_token)
    return MessageResponse(message="Logged out successfully")


@router.get(
    "/me",
    response_model=ApiResponse[UserOut],
    summary="Current user profile",
)
def me(current_user: User = Depends(get_current_user)) -> ApiResponse[UserOut]:
    return ApiResponse(data=UserOut.model_validate(current_user), message="Current user")


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change current user password",
)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    service.change_password(current_user, payload.old_password, payload.new_password)
    return MessageResponse(message="Password updated successfully")
