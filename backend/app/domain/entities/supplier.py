import uuid
from dataclasses import dataclass, field
from datetime import datetime

from app.shared.utils.helpers import utc_now


@dataclass
class Supplier:
    id: uuid.UUID
    name: str
    contact_name: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    country: str | None = None
    tax_id: str | None = None
    website: str | None = None
    is_active: bool = True
    is_deleted: bool = False
    deleted_at: datetime | None = None
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
