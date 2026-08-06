from __future__ import annotations
import uuid
from typing import Optional, Tuple

from app.application.schemas.notification import NotificationCreate
from app.core.exceptions import BadRequestError, NotFoundError
from app.domain.entities.notification import Notification
from app.domain.repositories.notification_repository import NotificationRepository
from app.domain.repositories.user_repository import UserRepository
from app.shared.utils.helpers import sanitize_text, utc_now


class NotificationService:
    def __init__(self, notification_repo: NotificationRepository, user_repo: UserRepository) -> None:
        self.notification_repo = notification_repo
        self.user_repo = user_repo

    def list(
        self,
        page: int,
        page_size: int,
        user_id: uuid.UUID,
        is_read: Optional[bool] = None,
    ) -> Tuple[list[Notification], int]:
        return self.notification_repo.list(
            page=page, page_size=page_size, user_id=user_id, is_read=is_read
        )

    def get_for_user(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> Notification:
        notification = self.notification_repo.get_by_id(notification_id)
        if notification is None:
            raise NotFoundError("Notification not found.")
        if notification.user_id != user_id:
            raise NotFoundError("Notification not found.")
        return notification

    def create(self, user_id: uuid.UUID, data: NotificationCreate) -> Notification:
        target_user_id = data.user_id or user_id
        if self.user_repo.get_by_id(target_user_id) is None:
            raise BadRequestError("Target user not found.")
        now = utc_now()
        entity = Notification(
            id=uuid.uuid4(),
            user_id=target_user_id,
            title=sanitize_text(data.title),
            body=sanitize_text(data.body) if data.body else None,
            notification_type=data.notification_type.value,
            data=data.data,
            created_at=now,
            updated_at=now,
        )
        return self.notification_repo.create(entity)

    def mark_read(self, notification_id: uuid.UUID, user_id: uuid.UUID) -> Notification:
        notification = self.get_for_user(notification_id, user_id)
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = utc_now()
            notification.updated_at = utc_now()
            return self.notification_repo.mark_read(notification)
        return notification

    def mark_all_read(self, user_id: uuid.UUID) -> int:
        page, page_size = 1, 100
        total_marked = 0
        while True:
            items, total = self.notification_repo.list(
                page=page, page_size=page_size, user_id=user_id, is_read=False
            )
            if not items:
                break
            for item in items:
                item.is_read = True
                item.read_at = utc_now()
                self.notification_repo.mark_read(item)
                total_marked += 1
            if page * page_size >= total:
                break
            page += 1
        return total_marked

    def count_unread(self, user_id: uuid.UUID) -> int:
        return self.notification_repo.count_unread(user_id)
