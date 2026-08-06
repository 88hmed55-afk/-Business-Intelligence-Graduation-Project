import uuid
from dataclasses import dataclass, field
from datetime import datetime

from app.shared.utils.helpers import utc_now


@dataclass
class Category:
    id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    parent_id: uuid.UUID | None = None
    sort_order: int = 0
    is_deleted: bool = False
    deleted_at: datetime | None = None
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
