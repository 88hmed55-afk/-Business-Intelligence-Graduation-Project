import uuid
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal

from app.shared.utils.helpers import utc_now


@dataclass
class Payment:
    id: uuid.UUID
    payment_number: str
    order_id: uuid.UUID
    amount: Decimal
    method: str
    status: str = "pending"
    transaction_id: str | None = None
    paid_at: datetime | None = None
    notes: str | None = None
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
