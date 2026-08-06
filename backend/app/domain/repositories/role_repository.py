from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple

from app.domain.entities.role import Permission, Role


class RoleRepository(ABC):
    """Contract for role persistence."""

    @abstractmethod
    def get_by_id(self, role_id: uuid.UUID) -> Optional[Role]: ...

    @abstractmethod
    def get_by_name(self, name: str) -> Optional[Role]: ...

    @abstractmethod
    def list(self, *, page: int, page_size: int, search: Optional[str] = None) -> Tuple[list[Role], int]: ...

    @abstractmethod
    def create(self, entity: Role) -> Role: ...

    @abstractmethod
    def update(self, entity: Role) -> Role: ...

    @abstractmethod
    def delete(self, entity: Role) -> None: ...

    @abstractmethod
    def count(self) -> int: ...


class PermissionRepository(ABC):
    """Contract for permission persistence."""

    @abstractmethod
    def get_by_code(self, code: str) -> Optional[Permission]: ...

    @abstractmethod
    def list(self, *, page: int, page_size: int, search: Optional[str] = None, module: Optional[str] = None) -> Tuple[list[Permission], int]: ...

    @abstractmethod
    def list_all(self) -> List[Permission]: ...

    @abstractmethod
    def create(self, entity: Permission) -> Permission: ...

    @abstractmethod
    def permissions_for_role(self, role_name: str) -> List[Permission]: ...

    @abstractmethod
    def assign_permissions(self, role_id: uuid.UUID, permission_ids: List[uuid.UUID]) -> None: ...
