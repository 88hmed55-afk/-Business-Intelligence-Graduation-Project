from __future__ import annotations
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2_000)
    parent_id: uuid.UUID | None = None
    sort_order: int = Field(default=0, ge=0)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2_000)
    parent_id: uuid.UUID | None = None
    sort_order: int | None = Field(default=None, ge=0)


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    parent_id: uuid.UUID | None = None
    sort_order: int
    created_at: datetime
    updated_at: datetime
