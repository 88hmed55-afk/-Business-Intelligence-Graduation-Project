from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional, Tuple

from app.domain.entities.notification import Notification


class NotificationRepository(ABC):
    """Contract for notification persistence."""

    @abstractmethod
    def get_by_id(self, notification_id: uuid.UUID) -> Optional[Notification]: ...

    @abstractmethod
    def list(
        self,
        *,
        page: int,
        page_size: int,
        user_id: uuid.UUID,
        is_read: Optional[bool] = None,
    ) -> Tuple[list[Notification], int]: ...

    @abstractmethod
    def create(self, entity: Notification) -> Notification: ...

    @abstractmethod
    def update(self, entity: Notification) -> Notification: ...

    @abstractmethod
    def mark_read(self, entity: Notification) -> Notification: ...

    @abstractmethod
    def count_unread(self, user_id: uuid.UUID) -> int: ...
