from __future__ import annotations
import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.shared.enums import CustomerStatus


class CustomerBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    company: str | None = Field(default=None, max_length=255)
    address: str | None = Field(default=None, max_length=2_000)
    city: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    status: CustomerStatus = CustomerStatus.ACTIVE
    notes: str | None = Field(default=None, max_length=5_000)


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    company: str | None = Field(default=None, max_length=255)
    address: str | None = Field(default=None, max_length=2_000)
    city: str | None = Field(default=None, max_length=100)
    country: str | None = Field(default=None, max_length=100)
    status: CustomerStatus | None = None
    notes: str | None = Field(default=None, max_length=5_000)


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    first_name: str
    last_name: str
    email: str | None = None
    phone: str | None = None
    company: str | None = None
    address: str | None = None
    city: str | None = None
    country: str | None = None
    status: CustomerStatus
    total_orders: int
    total_spent: Decimal
    notes: str | None = None
    full_name: str
    created_at: datetime
    updated_at: datetime
