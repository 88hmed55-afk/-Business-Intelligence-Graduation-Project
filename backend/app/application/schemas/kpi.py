import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.shared.enums import KpiCategory, KpiTrend


class KpiBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    category: KpiCategory = KpiCategory.FINANCE
    formula: str = Field(default="", max_length=2_000)
    target_value: Decimal | None = None
    current_value: Decimal | None = None
    unit: str | None = Field(default=None, max_length=50)


class KpiCreate(KpiBase):
    dashboard_id: uuid.UUID | None = None
    trend: KpiTrend = KpiTrend.FLAT


class KpiUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    category: KpiCategory | None = None
    formula: str | None = Field(default=None, max_length=2_000)
    target_value: Decimal | None = None
    current_value: Decimal | None = None
    unit: str | None = Field(default=None, max_length=50)
    trend: KpiTrend | None = None
    dashboard_id: uuid.UUID | None = None


class KpiValueUpdate(BaseModel):
    current_value: Decimal


class KpiOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: Optional[str] = None
    category: KpiCategory
    formula: str
    target_value: Optional[Decimal] = None
    current_value: Optional[Decimal] = None
    unit: Optional[str] = None
    trend: KpiTrend
    dashboard_id: Optional[uuid.UUID] = None
    created_by: uuid.UUID
    progress: float | None = None
    created_at: datetime
    updated_at: datetime
