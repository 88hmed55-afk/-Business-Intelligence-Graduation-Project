from __future__ import annotations
import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    sku: str = Field(min_length=1, max_length=100)
    barcode: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=5_000)
    category_id: uuid.UUID | None = None
    supplier_id: uuid.UUID | None = None
    unit_price: Decimal = Field(default=Decimal("0"), ge=0)
    cost_price: Decimal = Field(default=Decimal("0"), ge=0)
    reorder_level: Decimal = Field(default=Decimal("0"), ge=0)
    weight_kg: Decimal | None = Field(default=None, ge=0)
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    sku: str | None = Field(default=None, min_length=1, max_length=100)
    barcode: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=5_000)
    category_id: uuid.UUID | None = None
    supplier_id: uuid.UUID | None = None
    unit_price: Decimal | None = Field(default=None, ge=0)
    cost_price: Decimal | None = Field(default=None, ge=0)
    reorder_level: Decimal | None = Field(default=None, ge=0)
    weight_kg: Decimal | None = Field(default=None, ge=0)
    is_active: bool | None = None


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    sku: str
    barcode: str | None = None
    description: str | None = None
    category_id: uuid.UUID | None = None
    supplier_id: uuid.UUID | None = None
    unit_price: Decimal
    cost_price: Decimal
    reorder_level: Decimal
    weight_kg: Decimal | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
