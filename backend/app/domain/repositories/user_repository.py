from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Optional, Tuple

from app.domain.entities.user import User


class UserRepository(ABC):
    """Contract for user persistence."""

    @abstractmethod
    def get_by_id(self, user_id: uuid.UUID) -> Optional[User]: ...

    @abstractmethod
    def get_by_email(self, email: str) -> Optional[User]: ...

    @abstractmethod
    def get_by_username(self, username: str) -> Optional[User]: ...

    @abstractmethod
    def list(
        self, *, page: int, page_size: int, search: Optional[str] = None
    ) -> Tuple[list[User], int]: ...

    @abstractmethod
    def create(self, entity: User) -> User: ...

    @abstractmethod
    def update(self, entity: User) -> User: ...

    @abstractmethod
    def set_last_login(self, entity: User, last_login_at: datetime) -> User: ...

    @abstractmethod
    def delete(self, entity: User) -> None: ...

    @abstractmethod
    def count(self) -> int: ...

    @abstractmethod
    def count_active(self) -> int: ...
