import uuid
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal

from app.shared.utils.helpers import utc_now


@dataclass
class Product:
    id: uuid.UUID
    name: str
    sku: str
    unit_price: Decimal
    cost_price: Decimal
    barcode: str | None = None
    description: str | None = None
    category_id: uuid.UUID | None = None
    supplier_id: uuid.UUID | None = None
    reorder_level: Decimal = Decimal("0")
    weight_kg: Decimal | None = None
    is_active: bool = True
    is_deleted: bool = False
    deleted_at: datetime | None = None
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
