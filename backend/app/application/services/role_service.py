from __future__ import annotations
import threading
import time
import uuid
from typing import List, Optional, Tuple

from app.application.schemas.role import PermissionOut, RoleCreate, RoleUpdate
from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.domain.entities.role import Permission, Role
from app.domain.repositories.role_repository import PermissionRepository, RoleRepository
from app.shared.utils.helpers import utc_now

_SYSTEM_ROLES = ("admin", "analyst", "viewer", "sales_manager", "inventory_manager")


class RoleService:
    def __init__(self, role_repo: RoleRepository, permission_repo: PermissionRepository) -> None:
        self.role_repo = role_repo
        self.permission_repo = permission_repo

    def list(self, page: int, page_size: int, search: Optional[str] = None) -> Tuple[list[Role], int]:
        return self.role_repo.list(page=page, page_size=page_size, search=search)

    def get(self, role_id: uuid.UUID) -> Role:
        role = self.role_repo.get_by_id(role_id)
        if role is None:
            raise NotFoundError("Role not found.")
        return role

    def get_by_name(self, name: str) -> Optional[Role]:
        return self.role_repo.get_by_name(name)

    def get_detail(self, role_id: uuid.UUID) -> tuple[Role, list[Permission]]:
        role = self.get(role_id)
        permissions = self.permission_repo.permissions_for_role(role.name)
        return role, permissions

    def create(self, data: RoleCreate) -> Role:
        if data.name not in _SYSTEM_ROLES:
            raise BadRequestError(
                f"Role name must be one of: {', '.join(_SYSTEM_ROLES)}."
            )
        if self.role_repo.get_by_name(data.name):
            raise ConflictError("A role with this name already exists.")
        now = utc_now()
        role = Role(
            id=uuid.uuid4(),
            name=data.name,
            description=data.description,
            is_system=data.name in _SYSTEM_ROLES,
            created_at=now,
            updated_at=now,
        )
        created = self.role_repo.create(role)
        if data.permission_ids:
            self.permission_repo.assign_permissions(created.id, data.permission_ids)
        return created

    def update(self, role_id: uuid.UUID, data: RoleUpdate) -> Role:
        role = self.get(role_id)
        if role.is_system and data.description is None:
            pass
        provided = data.model_fields_set
        if "description" in provided:
            role.description = data.description
        role.updated_at = utc_now()
        updated = self.role_repo.update(role)
        if "permission_ids" in provided and data.permission_ids is not None:
            self.permission_repo.assign_permissions(updated.id, data.permission_ids)
        return updated

    def delete(self, role_id: uuid.UUID) -> None:
        role = self.get(role_id)
        if role.is_system:
            raise BadRequestError("System roles cannot be deleted.")
        self.role_repo.delete(role)

    def assign_permissions(self, role_id: uuid.UUID, permission_ids: List[uuid.UUID]) -> None:
        role = self.get(role_id)
        self.permission_repo.assign_permissions(role.id, permission_ids)

    def permissions_out(self, permissions: List[Permission]) -> List[PermissionOut]:
        return [PermissionOut.model_validate(p) for p in permissions]


class PermissionService:
    def __init__(self, permission_repo: PermissionRepository) -> None:
        self.permission_repo = permission_repo
        self._lock = threading.Lock()
        self._cache: dict[str, set[str]] = {}
        self._cache_ts: dict[str, float] = {}
        self._ttl_seconds = 60

    def list(
        self,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        module: Optional[str] = None,
    ) -> Tuple[list[Permission], int]:
        return self.permission_repo.list(page=page, page_size=page_size, search=search, module=module)

    def list_all(self) -> List[Permission]:
        return self.permission_repo.list_all()

    def get_by_code(self, code: str) -> Optional[Permission]:
        return self.permission_repo.get_by_code(code)

    def create(self, code: str, module: str, action: str, description: Optional[str] = None) -> Permission:
        if self.permission_repo.get_by_code(code):
            raise ConflictError(f"Permission '{code}' already exists.")
        now = utc_now()
        entity = Permission(
            id=uuid.uuid4(),
            code=code,
            module=module,
            action=action,
            description=description,
            created_at=now,
            updated_at=now,
        )
        return self.permission_repo.create(entity)

    def sync_default_permissions(self, modules: Tuple[str, ...], actions: Tuple[str, ...]) -> None:
        """Idempotently create the standard permission set."""
        existing = {p.code for p in self.permission_repo.list_all()}
        for module in modules:
            for action in actions:
                code = f"{module}:{action}"
                if code not in existing:
                    self.create(code, module, action, f"Allows {action} on {module}.")

    def resolve_permission_codes(self, role_name: str) -> set[str]:
        """Return the set of permission codes granted to a role (cached)."""
        with self._lock:
            cached = self._cache.get(role_name)
            if cached is not None and time.monotonic() - self._cache_ts.get(role_name, 0) < self._ttl_seconds:
                return cached
        permissions = self.permission_repo.permissions_for_role(role_name)
        codes = {p.code for p in permissions}
        with self._lock:
            self._cache[role_name] = codes
            self._cache_ts[role_name] = time.monotonic()
        return codes

    def invalidate(self, role_name: str) -> None:
        with self._lock:
            self._cache.pop(role_name, None)
            self._cache_ts.pop(role_name, None)
