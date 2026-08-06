from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional, Tuple

from app.domain.entities.setting import Setting


class SettingRepository(ABC):
    """Contract for settings persistence."""

    @abstractmethod
    def get_by_id(self, setting_id: uuid.UUID) -> Optional[Setting]: ...

    @abstractmethod
    def get_by_key(self, key: str) -> Optional[Setting]: ...

    @abstractmethod
    def list(self, *, page: int, page_size: int, search: Optional[str] = None, group_name: Optional[str] = None) -> Tuple[list[Setting], int]: ...

    @abstractmethod
    def create(self, entity: Setting) -> Setting: ...

    @abstractmethod
    def update(self, entity: Setting) -> Setting: ...

    @abstractmethod
    def delete(self, entity: Setting) -> None: ...

    @abstractmethod
    def upsert(self, key: str, value: object, group_name: str, description: str | None, is_public: bool) -> Setting: ...
