import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union

import bcrypt
import jwt

from app.core.config import get_settings

_ALGORITHM = get_settings().JWT_ALGORITHM


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        return False


def _encode(payload: dict[str, Any]) -> str:
    return jwt.encode(payload, get_settings().SECRET_KEY, algorithm=_ALGORITHM)


def create_access_token(subject: Union[str, uuid.UUID], expires_minutes: Optional[int] = None) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return _encode(
        {"sub": str(subject), "type": "access", "iat": now, "exp": expires}
    )


def create_refresh_token(subject: Union[str, uuid.UUID], expires_days: Optional[int] = None) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=expires_days or settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return _encode(
        {
            "sub": str(subject),
            "type": "refresh",
            "jti": uuid.uuid4().hex,
            "iat": now,
            "exp": expires,
        }
    )


def decode_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT. Raises jwt.PyJWTError for invalid/expired tokens."""
    return jwt.decode(token, get_settings().SECRET_KEY, algorithms=[_ALGORITHM])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
