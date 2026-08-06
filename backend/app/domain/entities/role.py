import uuid
from dataclasses import dataclass, field
from datetime import datetime

from app.shared.utils.helpers import utc_now


@dataclass
class Role:
    id: uuid.UUID
    name: str
    description: str | None = None
    is_system: bool = False
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)


@dataclass
class Permission:
    id: uuid.UUID
    code: str
    module: str
    action: str
    description: str | None = None
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
