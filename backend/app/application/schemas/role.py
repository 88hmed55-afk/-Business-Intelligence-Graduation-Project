from __future__ import annotations
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    description: str | None = None
    module: str
    action: str
    created_at: datetime
    updated_at: datetime


class RoleBase(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    description: str | None = Field(default=None, max_length=1_000)


class RoleCreate(RoleBase):
    permission_ids: list[uuid.UUID] = Field(default_factory=list)


class RoleUpdate(BaseModel):
    description: str | None = Field(default=None, max_length=1_000)
    permission_ids: list[uuid.UUID] | None = None


class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None = None
    is_system: bool
    created_at: datetime
    updated_at: datetime


class RoleDetail(RoleOut):
    permissions: list[PermissionOut] = Field(default_factory=list)


class RolePermissionAssign(BaseModel):
    permission_ids: list[uuid.UUID] = Field(min_length=1)
