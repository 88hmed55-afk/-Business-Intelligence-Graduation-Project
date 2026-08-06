from __future__ import annotations
import uuid
from typing import List, Optional, Tuple

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.domain.entities.role import Permission, Role
from app.domain.repositories.role_repository import PermissionRepository, RoleRepository
from app.infrastructure.models.role import Permission as PermissionModel
from app.infrastructure.models.role import Role as RoleModel
from app.infrastructure.models.role import role_permissions


class SQLAlchemyRoleRepository(RoleRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_domain(self, model: Optional[RoleModel]) -> Optional[Role]:
        if model is None:
            return None
        return Role(
            id=model.id,
            name=model.name,
            description=model.description,
            is_system=model.is_system,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def get_by_id(self, role_id: uuid.UUID) -> Optional[Role]:
        return self._to_domain(self.db.get(RoleModel, role_id))

    def get_by_name(self, name: str) -> Optional[Role]:
        stmt = select(RoleModel).where(RoleModel.name == name)
        return self._to_domain(self.db.scalar(stmt))

    def list(self, *, page: int, page_size: int, search: Optional[str] = None) -> Tuple[list[Role], int]:
        stmt = select(RoleModel)
        if search:
            like = f"%{search.strip()}%"
            stmt = stmt.where(or_(RoleModel.name.ilike(like), RoleModel.description.ilike(like)))
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(RoleModel.created_at.asc()).offset((page - 1) * page_size).limit(page_size)
        ).all()
        return [self._to_domain(r) for r in rows if r], total

    def create(self, entity: Role) -> Role:
        model = RoleModel(
            id=entity.id,
            name=entity.name,
            description=entity.description,
            is_system=entity.is_system,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def update(self, entity: Role) -> Role:
        model = self.db.get(RoleModel, entity.id)
        if model is None:
            raise NotFoundError("Role not found.")
        model.name = entity.name
        model.description = entity.description
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def delete(self, entity: Role) -> None:
        model = self.db.get(RoleModel, entity.id)
        if model is not None:
            self.db.delete(model)
            self.db.commit()

    def count(self) -> int:
        return self.db.scalar(select(func.count()).select_from(RoleModel)) or 0


class SQLAlchemyPermissionRepository(PermissionRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_domain(self, model: Optional[PermissionModel]) -> Optional[Permission]:
        if model is None:
            return None
        return Permission(
            id=model.id,
            code=model.code,
            module=model.module,
            action=model.action,
            description=model.description,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def get_by_code(self, code: str) -> Optional[Permission]:
        stmt = select(PermissionModel).where(PermissionModel.code == code)
        return self._to_domain(self.db.scalar(stmt))

    def list(self, *, page: int, page_size: int, search: Optional[str] = None, module: Optional[str] = None) -> Tuple[list[Permission], int]:
        stmt = select(PermissionModel)
        if module:
            stmt = stmt.where(PermissionModel.module == module)
        if search:
            like = f"%{search.strip()}%"
            stmt = stmt.where(or_(PermissionModel.code.ilike(like), PermissionModel.description.ilike(like)))
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(PermissionModel.module.asc(), PermissionModel.action.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return [self._to_domain(r) for r in rows if r], total

    def list_all(self) -> List[Permission]:
        rows = self.db.scalars(select(PermissionModel).order_by(PermissionModel.code.asc())).all()
        return [self._to_domain(r) for r in rows if r]

    def create(self, entity: Permission) -> Permission:
        model = PermissionModel(
            id=entity.id,
            code=entity.code,
            module=entity.module,
            action=entity.action,
            description=entity.description,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def permissions_for_role(self, role_name: str) -> List[Permission]:
        stmt = (
            select(PermissionModel)
            .join(role_permissions, role_permissions.c.permission_id == PermissionModel.id)
            .join(RoleModel, RoleModel.id == role_permissions.c.role_id)
            .where(RoleModel.name == role_name)
        )
        rows = self.db.scalars(stmt).all()
        return [self._to_domain(r) for r in rows if r]

    def assign_permissions(self, role_id: uuid.UUID, permission_ids: List[uuid.UUID]) -> None:
        self.db.execute(role_permissions.delete().where(role_permissions.c.role_id == role_id))
        if permission_ids:
            self.db.execute(
                role_permissions.insert(),
                [{"role_id": role_id, "permission_id": pid} for pid in permission_ids],
            )
        self.db.commit()
