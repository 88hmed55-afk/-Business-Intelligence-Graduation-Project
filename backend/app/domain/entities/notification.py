import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict

from app.shared.utils.helpers import utc_now


@dataclass
class Notification:
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    body: str | None = None
    notification_type: str = "info"
    is_read: bool = False
    read_at: datetime | None = None
    data: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
