import uuid
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal

from app.shared.utils.helpers import utc_now


@dataclass
class Inventory:
    id: uuid.UUID
    product_id: uuid.UUID
    quantity: Decimal = Decimal("0")
    reserved_quantity: Decimal = Decimal("0")
    warehouse: str = "main"
    location: str | None = None
    last_restocked_at: datetime | None = None
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)

    @property
    def available_quantity(self) -> Decimal:
        return (self.quantity or Decimal("0")) - (self.reserved_quantity or Decimal("0"))


@dataclass
class InventoryMovement:
    id: uuid.UUID
    inventory_id: uuid.UUID
    product_id: uuid.UUID
    movement_type: str
    quantity_change: Decimal
    moved_at: datetime
    reference: str | None = None
    note: str | None = None
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
