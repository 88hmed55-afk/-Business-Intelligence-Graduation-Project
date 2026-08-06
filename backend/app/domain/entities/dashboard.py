import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional

from app.shared.utils.helpers import utc_now


@dataclass
class Dashboard:
    id: uuid.UUID
    name: str
    slug: str
    created_by: uuid.UUID
    description: Optional[str] = None
    config: Dict[str, Any] = field(default_factory=dict)
    is_favorite: bool = False
    is_public: bool = False
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
