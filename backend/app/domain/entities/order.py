import uuid
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal

from app.shared.utils.helpers import utc_now


@dataclass
class OrderItem:
    id: uuid.UUID
    order_id: uuid.UUID
    product_id: uuid.UUID
    quantity: Decimal
    unit_price: Decimal
    line_total: Decimal
    discount_amount: Decimal = Decimal("0")
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)


@dataclass
class Order:
    id: uuid.UUID
    order_number: str
    customer_id: uuid.UUID
    status: str = "pending"
    subtotal: Decimal = Decimal("0")
    discount_amount: Decimal = Decimal("0")
    tax_amount: Decimal = Decimal("0")
    shipping_fee: Decimal = Decimal("0")
    total_amount: Decimal = Decimal("0")
    currency: str = "USD"
    payment_status: str = "unpaid"
    order_date: datetime = field(default_factory=utc_now)
    delivered_at: datetime | None = None
    notes: str | None = None
    items: list[OrderItem] = field(default_factory=list)
    is_deleted: bool = False
    deleted_at: datetime | None = None
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
