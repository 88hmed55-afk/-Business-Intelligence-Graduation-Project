from __future__ import annotations
import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.shared.enums import InventoryMovement


class InventoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    quantity: Decimal
    reserved_quantity: Decimal
    available_quantity: Decimal
    warehouse: str
    location: str | None = None
    last_restocked_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class InventoryAdjustRequest(BaseModel):
    delta: Decimal = Field(ge=0)
    movement_type: InventoryMovement = InventoryMovement.ADJUSTED
    reference: str | None = Field(default=None, max_length=150)
    note: str | None = Field(default=None, max_length=500)


class InventoryMovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    inventory_id: uuid.UUID
    product_id: uuid.UUID
    movement_type: InventoryMovement
    quantity_change: Decimal
    reference: str | None = None
    note: str | None = None
    moved_at: datetime
    created_at: datetime
