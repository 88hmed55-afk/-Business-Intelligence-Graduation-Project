import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional

from app.shared.utils.helpers import utc_now


@dataclass
class ActivityLog:
    id: uuid.UUID
    action: str
    module: str
    summary: str = ""
    user_id: uuid.UUID | None = None
    entity_type: str | None = None
    entity_id: uuid.UUID | None = None
    details: Dict[str, Any] = field(default_factory=dict)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
