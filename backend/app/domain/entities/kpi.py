import uuid
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Optional

from app.shared.utils.helpers import utc_now


@dataclass
class KPI:
    id: uuid.UUID
    name: str
    category: str
    formula: str
    created_by: uuid.UUID
    description: Optional[str] = None
    target_value: Optional[Decimal] = None
    current_value: Optional[Decimal] = None
    unit: Optional[str] = None
    trend: str = "flat"
    dashboard_id: Optional[uuid.UUID] = None
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
