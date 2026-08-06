from __future__ import annotations
import uuid
from typing import Optional, Tuple

from app.application.schemas.setting import SettingCreate, SettingUpdate
from app.core.exceptions import ConflictError, NotFoundError
from app.domain.entities.setting import Setting
from app.domain.repositories.setting_repository import SettingRepository
from app.shared.utils.helpers import sanitize_text, utc_now


class SettingService:
    def __init__(self, setting_repo: SettingRepository) -> None:
        self.setting_repo = setting_repo

    def list(
        self,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        group_name: Optional[str] = None,
    ) -> Tuple[list[Setting], int]:
        return self.setting_repo.list(
            page=page, page_size=page_size, search=search, group_name=group_name
        )

    def get(self, setting_id: uuid.UUID) -> Setting:
        setting = self.setting_repo.get_by_id(setting_id)
        if setting is None:
            raise NotFoundError("Setting not found.")
        return setting

    def get_by_key(self, key: str) -> Setting:
        setting = self.setting_repo.get_by_key(key)
        if setting is None:
            raise NotFoundError(f"Setting '{key}' not found.")
        return setting

    def create(self, data: SettingCreate) -> Setting:
        if self.setting_repo.get_by_key(data.key):
            raise ConflictError(f"A setting with key '{data.key}' already exists.")
        now = utc_now()
        entity = Setting(
            id=uuid.uuid4(),
            key=data.key,
            value=data.value,
            group_name=data.group_name,
            description=sanitize_text(data.description) if data.description else None,
            is_public=data.is_public,
            created_at=now,
            updated_at=now,
        )
        return self.setting_repo.create(entity)

    def update(self, setting_id: uuid.UUID, data: SettingUpdate) -> Setting:
        setting = self.get(setting_id)
        provided = data.model_fields_set

        if "value" in provided and data.value is not None:
            setting.value = data.value
        if "group_name" in provided and data.group_name is not None:
            setting.group_name = data.group_name
        if "description" in provided:
            setting.description = sanitize_text(data.description) if data.description else None
        if "is_public" in provided and data.is_public is not None:
            setting.is_public = data.is_public

        setting.updated_at = utc_now()
        return self.setting_repo.update(setting)

    def upsert(
        self,
        key: str,
        value: object,
        group_name: str = "general",
        description: str | None = None,
        is_public: bool = False,
    ) -> Setting:
        return self.setting_repo.upsert(
            key, value, group_name, sanitize_text(description) if description else None, is_public
        )

    def delete(self, setting_id: uuid.UUID) -> None:
        setting = self.get(setting_id)
        self.setting_repo.delete(setting)
