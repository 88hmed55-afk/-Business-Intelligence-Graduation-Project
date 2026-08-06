import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field


class DashboardBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    config: Dict[str, Any] = Field(default_factory=dict)


class DashboardCreate(DashboardBase):
    is_public: bool = False


class DashboardUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    config: Dict[str, Any] | None = None
    is_public: bool | None = None
    is_favorite: bool | None = None


class DashboardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str] = None
    config: Dict[str, Any]
    is_favorite: bool
    is_public: bool
    created_by: uuid.UUID
    kpi_count: int = 0
    created_at: datetime
    updated_at: datetime
