from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple

from app.domain.entities.activity_log import ActivityLog


class ActivityLogRepository(ABC):
    """Contract for activity log persistence."""

    @abstractmethod
    def get_by_id(self, log_id: uuid.UUID) -> Optional[ActivityLog]: ...

    @abstractmethod
    def list(
        self,
        *,
        page: int,
        page_size: int,
        user_id: Optional[uuid.UUID] = None,
        module: Optional[str] = None,
        action: Optional[str] = None,
        date_from: Optional[object] = None,
        date_to: Optional[object] = None,
    ) -> Tuple[list[ActivityLog], int]: ...

    @abstractmethod
    def create(self, entity: ActivityLog) -> ActivityLog: ...

    @abstractmethod
    def purge_before(self, before: object) -> int: ...
