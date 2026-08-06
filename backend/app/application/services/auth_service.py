import uuid

import jwt
import redis as redis_lib

from app.application.schemas.auth import TokenResponse
from app.application.schemas.user import UserOut
from app.core.config import get_settings
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.redis import get_redis
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.domain.entities.user import User
from app.domain.repositories.user_repository import UserRepository
from app.shared.utils.helpers import utc_now

_REVOKED_TTL_SECONDS = 60 * 60 * 24 * 7


class AuthService:
    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    def login(self, email: str, password: str) -> TokenResponse:
        user = self.user_repo.get_by_email(email.strip().lower())
        if user is None or not verify_password(password, user.hashed_password):
            raise UnauthorizedError("Invalid email or password.")
        if not user.is_active:
            raise ForbiddenError("This account is disabled.")
        self.user_repo.set_last_login(user, utc_now())
        return self._issue_tokens(user)

    def refresh(self, refresh_token: str) -> TokenResponse:
        try:
            payload = decode_token(refresh_token)
        except jwt.PyJWTError as exc:
            raise UnauthorizedError("Invalid or expired refresh token.") from exc

        if payload.get("type") != "refresh":
            raise UnauthorizedError("Invalid token type.")

        jti = payload.get("jti")
        if jti and self._is_revoked(jti):
            raise UnauthorizedError("Refresh token has been revoked.")

        try:
            user_id = uuid.UUID(str(payload.get("sub")))
        except (ValueError, TypeError) as exc:
            raise UnauthorizedError("Invalid refresh token.") from exc

        user = self.user_repo.get_by_id(user_id)
        if user is None or not user.is_active:
            raise UnauthorizedError("User account is unavailable.")
        return self._issue_tokens(user)

    def logout(self, refresh_token: str) -> None:
        try:
            payload = decode_token(refresh_token)
        except jwt.PyJWTError:
            return
        jti = payload.get("jti")
        if not jti:
            return
        try:
            get_redis().setex(f"auth:refresh:revoked:{jti}", _REVOKED_TTL_SECONDS, "1")
        except redis_lib.RedisError:
            pass

    def change_password(self, current_user: User, old_password: str, new_password: str) -> None:
        if not verify_password(old_password, current_user.hashed_password):
            raise UnauthorizedError("Current password is incorrect.")
        current_user.hashed_password = hash_password(new_password)
        current_user.updated_at = utc_now()
        self.user_repo.update(current_user)

    def _is_revoked(self, jti: str) -> bool:
        try:
            return bool(get_redis().exists(f"auth:refresh:revoked:{jti}"))
        except redis_lib.RedisError:
            return False

    def _issue_tokens(self, user: User) -> TokenResponse:
        settings = get_settings()
        return TokenResponse(
            access_token=create_access_token(str(user.id)),
            refresh_token=create_refresh_token(str(user.id)),
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserOut.model_validate(user),
        )
