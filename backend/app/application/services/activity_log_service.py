from __future__ import annotations
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

from app.core.exceptions import NotFoundError
from app.domain.entities.activity_log import ActivityLog
from app.domain.repositories.activity_log_repository import ActivityLogRepository
from app.shared.utils.helpers import utc_now


class ActivityLogService:
    def __init__(self, activity_log_repo: ActivityLogRepository) -> None:
        self.activity_log_repo = activity_log_repo

    def list(
        self,
        page: int,
        page_size: int,
        user_id: Optional[uuid.UUID] = None,
        module: Optional[str] = None,
        action: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> Tuple[list[ActivityLog], int]:
        return self.activity_log_repo.list(
            page=page,
            page_size=page_size,
            user_id=user_id,
            module=module,
            action=action,
            date_from=date_from,
            date_to=date_to,
        )

    def get(self, log_id: uuid.UUID) -> ActivityLog:
        log = self.activity_log_repo.get_by_id(log_id)
        if log is None:
            raise NotFoundError("Activity log entry not found.")
        return log

    def record(
        self,
        *,
        action: str,
        module: str,
        summary: str = "",
        user_id: Optional[uuid.UUID] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[uuid.UUID] = None,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> ActivityLog:
        now = utc_now()
        entity = ActivityLog(
            id=uuid.uuid4(),
            action=action,
            module=module,
            summary=summary,
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=now,
            updated_at=now,
        )
        return self.activity_log_repo.create(entity)

    def purge_older_than(self, days: int = 180) -> int:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        return self.activity_log_repo.purge_before(cutoff)
