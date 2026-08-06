import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.shared.enums import ReportStatus


class ReportBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    query: str = Field(default="", max_length=10_000)
    schedule: str | None = Field(default=None, max_length=255)


class ReportCreate(ReportBase):
    status: ReportStatus = ReportStatus.DRAFT
    config: Dict[str, Any] = Field(default_factory=dict)


class ReportUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    query: str | None = Field(default=None, max_length=10_000)
    schedule: str | None = Field(default=None, max_length=255)
    config: Dict[str, Any] | None = None
    status: ReportStatus | None = None


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: Optional[str] = None
    query: str
    status: ReportStatus
    schedule: Optional[str] = None
    config: Dict[str, Any]
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime
