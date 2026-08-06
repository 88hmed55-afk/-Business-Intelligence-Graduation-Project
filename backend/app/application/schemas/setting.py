from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any, Dict

from pydantic import BaseModel, ConfigDict, Field


class SettingBase(BaseModel):
    key: str = Field(min_length=1, max_length=150)
    value: Dict[str, Any]
    group_name: str = Field(default="general", min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2_000)
    is_public: bool = False


class SettingCreate(SettingBase):
    pass


class SettingUpdate(BaseModel):
    value: Dict[str, Any] | None = None
    group_name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=2_000)
    is_public: bool | None = None


class SettingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    key: str
    value: Dict[str, Any]
    group_name: str
    description: str | None = None
    is_public: bool
    created_at: datetime
    updated_at: datetime
