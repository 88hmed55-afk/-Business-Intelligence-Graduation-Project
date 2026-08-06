import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict

from app.shared.utils.helpers import utc_now


@dataclass
class Setting:
    id: uuid.UUID
    key: str
    value: Dict[str, Any]
    group_name: str = "general"
    description: str | None = None
    is_public: bool = False
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
