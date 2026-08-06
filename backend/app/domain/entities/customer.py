import uuid
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal

from app.shared.utils.helpers import utc_now


@dataclass
class Customer:
    id: uuid.UUID
    first_name: str
    last_name: str
    email: str | None = None
    phone: str | None = None
    company: str | None = None
    address: str | None = None
    city: str | None = None
    country: str | None = None
    status: str = "active"
    total_orders: int = 0
    total_spent: Decimal = Decimal("0")
    notes: str | None = None
    is_deleted: bool = False
    deleted_at: datetime | None = None
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()
