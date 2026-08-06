from __future__ import annotations
import uuid
from typing import Optional, Tuple

from sqlalchemy import delete as sa_delete
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.domain.entities.activity_log import ActivityLog
from app.domain.repositories.activity_log_repository import ActivityLogRepository
from app.infrastructure.models.activity_log import ActivityLog as ActivityLogModel


class SQLAlchemyActivityLogRepository(ActivityLogRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_domain(self, model: Optional[ActivityLogModel]) -> Optional[ActivityLog]:
        if model is None:
            return None
        return ActivityLog(
            id=model.id,
            action=model.action,
            module=model.module,
            summary=model.summary,
            user_id=model.user_id,
            entity_type=model.entity_type,
            entity_id=model.entity_id,
            details=model.details,
            ip_address=model.ip_address,
            user_agent=model.user_agent,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def get_by_id(self, log_id: uuid.UUID) -> Optional[ActivityLog]:
        return self._to_domain(self.db.get(ActivityLogModel, log_id))

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
    ) -> Tuple[list[ActivityLog], int]:
        stmt = select(ActivityLogModel)
        if user_id is not None:
            stmt = stmt.where(ActivityLogModel.user_id == user_id)
        if module:
            stmt = stmt.where(ActivityLogModel.module == module)
        if action:
            stmt = stmt.where(ActivityLogModel.action == action)
        if date_from is not None:
            stmt = stmt.where(ActivityLogModel.created_at >= date_from)
        if date_to is not None:
            stmt = stmt.where(ActivityLogModel.created_at <= date_to)
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(ActivityLogModel.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return [self._to_domain(r) for r in rows if r], total

    def create(self, entity: ActivityLog) -> ActivityLog:
        model = ActivityLogModel(
            id=entity.id,
            action=entity.action,
            module=entity.module,
            summary=entity.summary,
            user_id=entity.user_id,
            entity_type=entity.entity_type,
            entity_id=entity.entity_id,
            details=entity.details,
            ip_address=entity.ip_address,
            user_agent=entity.user_agent,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def purge_before(self, before: object) -> int:
        stmt = sa_delete(ActivityLogModel).where(ActivityLogModel.created_at < before)
        result = self.db.execute(stmt)
        self.db.commit()
        return result.rowcount or 0
