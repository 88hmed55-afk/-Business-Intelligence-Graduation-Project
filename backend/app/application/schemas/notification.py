from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any, Dict

from pydantic import BaseModel, ConfigDict, Field

from app.shared.enums import NotificationType


class NotificationBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    body: str | None = Field(default=None, max_length=5_000)
    notification_type: NotificationType = NotificationType.INFO
    data: Dict[str, Any] = Field(default_factory=dict)


class NotificationCreate(NotificationBase):
    user_id: uuid.UUID | None = None


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    body: str | None = None
    notification_type: NotificationType
    is_read: bool
    read_at: datetime | None = None
    data: Dict[str, Any]
    created_at: datetime
