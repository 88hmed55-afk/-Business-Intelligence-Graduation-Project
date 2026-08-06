from __future__ import annotations
import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.shared.enums import PaymentMethod, PaymentStatus


class PaymentBase(BaseModel):
    order_id: uuid.UUID
    amount: Decimal = Field(gt=0)
    method: PaymentMethod
    status: PaymentStatus = PaymentStatus.PENDING
    transaction_id: str | None = Field(default=None, max_length=200)
    paid_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=500)


class PaymentCreate(PaymentBase):
    pass


class PaymentUpdate(BaseModel):
    amount: Decimal | None = Field(default=None, gt=0)
    method: PaymentMethod | None = None
    status: PaymentStatus | None = None
    transaction_id: str | None = Field(default=None, max_length=200)
    paid_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=500)


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    payment_number: str
    order_id: uuid.UUID
    amount: Decimal
    method: PaymentMethod
    status: PaymentStatus
    transaction_id: str | None = None
    paid_at: datetime | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
