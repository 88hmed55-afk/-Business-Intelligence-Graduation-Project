from __future__ import annotations
import uuid
from typing import Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.domain.entities.notification import Notification
from app.domain.repositories.notification_repository import NotificationRepository
from app.infrastructure.models.notification import Notification as NotificationModel


class SQLAlchemyNotificationRepository(NotificationRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_domain(self, model: Optional[NotificationModel]) -> Optional[Notification]:
        if model is None:
            return None
        return Notification(
            id=model.id,
            user_id=model.user_id,
            title=model.title,
            body=model.body,
            notification_type=model.notification_type,
            is_read=model.is_read,
            read_at=model.read_at,
            data=model.data,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def get_by_id(self, notification_id: uuid.UUID) -> Optional[Notification]:
        return self._to_domain(self.db.get(NotificationModel, notification_id))

    def list(
        self,
        *,
        page: int,
        page_size: int,
        user_id: uuid.UUID,
        is_read: Optional[bool] = None,
    ) -> Tuple[list[Notification], int]:
        stmt = select(NotificationModel).where(NotificationModel.user_id == user_id)
        if is_read is not None:
            stmt = stmt.where(NotificationModel.is_read.is_(is_read))
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(NotificationModel.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return [self._to_domain(r) for r in rows if r], total

    def create(self, entity: Notification) -> Notification:
        model = NotificationModel(
            id=entity.id,
            user_id=entity.user_id,
            title=entity.title,
            body=entity.body,
            notification_type=entity.notification_type,
            is_read=entity.is_read,
            read_at=entity.read_at,
            data=entity.data,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def update(self, entity: Notification) -> Notification:
        model = self.db.get(NotificationModel, entity.id)
        if model is None:
            raise NotFoundError("Notification not found.")
        model.title = entity.title
        model.body = entity.body
        model.notification_type = entity.notification_type
        model.is_read = entity.is_read
        model.read_at = entity.read_at
        model.data = entity.data
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def mark_read(self, entity: Notification) -> Notification:
        model = self.db.get(NotificationModel, entity.id)
        if model is None:
            raise NotFoundError("Notification not found.")
        model.is_read = True
        model.read_at = entity.read_at
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def count_unread(self, user_id: uuid.UUID) -> int:
        return (
            self.db.scalar(
                select(func.count())
                .select_from(NotificationModel)
                .where(NotificationModel.user_id == user_id, NotificationModel.is_read.is_(False))
            )
            or 0
        )
