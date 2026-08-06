from __future__ import annotations
import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.shared.enums import OrderStatus


class OrderItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: Decimal = Field(gt=0)
    unit_price: Decimal | None = Field(default=None, ge=0)
    discount_amount: Decimal = Field(default=Decimal("0"), ge=0)


class OrderItemUpdate(BaseModel):
    product_id: uuid.UUID | None = None
    quantity: Decimal | None = Field(default=None, gt=0)
    unit_price: Decimal | None = Field(default=None, ge=0)
    discount_amount: Decimal | None = Field(default=None, ge=0)


class OrderBase(BaseModel):
    customer_id: uuid.UUID
    status: OrderStatus = OrderStatus.PENDING
    currency: str = Field(default="USD", min_length=3, max_length=10)
    shipping_fee: Decimal = Field(default=Decimal("0"), ge=0)
    notes: str | None = Field(default=None, max_length=5_000)
    items: list[OrderItemCreate] = Field(default_factory=list, max_length=100)


class OrderCreate(OrderBase):
    pass


class OrderUpdate(BaseModel):
    customer_id: uuid.UUID | None = None
    status: OrderStatus | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=10)
    shipping_fee: Decimal | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=5_000)


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_id: uuid.UUID
    product_id: uuid.UUID
    product_name: str | None = None
    quantity: Decimal
    unit_price: Decimal
    discount_amount: Decimal
    line_total: Decimal


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_number: str
    customer_id: uuid.UUID
    customer_name: str | None = None
    status: OrderStatus
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    shipping_fee: Decimal
    total_amount: Decimal
    currency: str
    payment_status: str
    order_date: datetime
    delivered_at: datetime | None = None
    notes: str | None = None
    items: list[OrderItemOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
