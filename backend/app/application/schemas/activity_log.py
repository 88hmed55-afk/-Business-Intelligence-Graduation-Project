from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict

from app.shared.enums import ActivityAction


class ActivityLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    action: ActivityAction
    module: str
    summary: str
    user_id: uuid.UUID | None = None
    user_email: str | None = None
    entity_type: str | None = None
    entity_id: uuid.UUID | None = None
    details: Dict[str, Any]
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
