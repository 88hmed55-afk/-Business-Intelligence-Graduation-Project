import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.shared.enums import UserRole


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9_.-]+$")
    full_name: str = Field(min_length=2, max_length=255)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.ANALYST


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    username: str | None = Field(
        default=None, min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9_.-]+$"
    )
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    role: UserRole | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class SelfUpdateRequest(BaseModel):
    email: EmailStr | None = None
    username: str | None = Field(
        default=None, min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9_.-]+$"
    )
    full_name: str | None = Field(default=None, min_length=2, max_length=255)


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    username: str
    full_name: str
    role: UserRole
    is_active: bool
    is_superuser: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
