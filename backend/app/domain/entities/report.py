import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional

from app.shared.utils.helpers import utc_now


@dataclass
class Report:
    id: uuid.UUID
    name: str
    created_by: uuid.UUID
    description: Optional[str] = None
    query: str = ""
    status: str = "draft"
    schedule: Optional[str] = None
    config: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
