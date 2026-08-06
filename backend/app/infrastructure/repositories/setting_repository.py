from __future__ import annotations
import uuid
from typing import Optional, Tuple

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.domain.entities.setting import Setting
from app.domain.repositories.setting_repository import SettingRepository
from app.infrastructure.models.setting import Setting as SettingModel


class SQLAlchemySettingRepository(SettingRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_domain(self, model: Optional[SettingModel]) -> Optional[Setting]:
        if model is None:
            return None
        return Setting(
            id=model.id,
            key=model.key,
            value=model.value,
            group_name=model.group_name,
            description=model.description,
            is_public=model.is_public,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def get_by_key(self, key: str) -> Optional[Setting]:
        stmt = select(SettingModel).where(SettingModel.key == key)
        return self._to_domain(self.db.scalar(stmt))

    def get_by_id(self, setting_id: uuid.UUID) -> Optional[Setting]:
        return self._to_domain(self.db.get(SettingModel, setting_id))

    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        group_name: Optional[str] = None,
    ) -> Tuple[list[Setting], int]:
        stmt = select(SettingModel)
        if group_name:
            stmt = stmt.where(SettingModel.group_name == group_name)
        if search:
            like = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(SettingModel.key.ilike(like), SettingModel.description.ilike(like))
            )
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(SettingModel.group_name.asc(), SettingModel.key.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return [self._to_domain(r) for r in rows if r], total

    def create(self, entity: Setting) -> Setting:
        model = SettingModel(
            id=entity.id,
            key=entity.key,
            value=entity.value,
            group_name=entity.group_name,
            description=entity.description,
            is_public=entity.is_public,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def update(self, entity: Setting) -> Setting:
        model = self.db.get(SettingModel, entity.id)
        if model is None:
            raise NotFoundError("Setting not found.")
        model.key = entity.key
        model.value = entity.value
        model.group_name = entity.group_name
        model.description = entity.description
        model.is_public = entity.is_public
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def delete(self, entity: Setting) -> None:
        model = self.db.get(SettingModel, entity.id)
        if model is not None:
            self.db.delete(model)
            self.db.commit()

    def upsert(
        self,
        key: str,
        value: object,
        group_name: str,
        description: str | None,
        is_public: bool,
    ) -> Setting:
        model = self.db.scalar(select(SettingModel).where(SettingModel.key == key))
        if model is None:
            model = SettingModel(
                id=uuid.uuid4(),
                key=key,
                value=value,
                group_name=group_name,
                description=description,
                is_public=is_public,
            )
            self.db.add(model)
        else:
            model.value = value
            model.group_name = group_name
            model.description = description
            model.is_public = is_public
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or Setting(id=model.id, key=key, value=dict(value))
