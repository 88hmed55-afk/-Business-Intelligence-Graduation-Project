import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from app.shared.utils.helpers import utc_now


@dataclass
class User:
    id: uuid.UUID
    email: str
    username: str
    full_name: str
    hashed_password: str
    role: str = "analyst"
    is_active: bool = True
    is_superuser: bool = False
    last_login_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
