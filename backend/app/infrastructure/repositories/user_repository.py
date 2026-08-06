import uuid
from datetime import datetime
from typing import Optional, Tuple

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.domain.entities.user import User
from app.domain.repositories.user_repository import UserRepository
from app.infrastructure.models.user import User as UserModel


class SQLAlchemyUserRepository(UserRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_domain(self, model: Optional[UserModel]) -> Optional[User]:
        if model is None:
            return None
        return User(
            id=model.id,
            email=model.email,
            username=model.username,
            full_name=model.full_name,
            hashed_password=model.hashed_password,
            role=model.role,
            is_active=model.is_active,
            is_superuser=model.is_superuser,
            last_login_at=model.last_login_at,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_model(self, entity: User) -> UserModel:
        return UserModel(
            id=entity.id,
            email=entity.email,
            username=entity.username,
            full_name=entity.full_name,
            hashed_password=entity.hashed_password,
            role=entity.role,
            is_active=entity.is_active,
            is_superuser=entity.is_superuser,
            last_login_at=entity.last_login_at,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )

    def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        return self._to_domain(self.db.get(UserModel, user_id))

    def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(UserModel).where(UserModel.email == email.lower())
        return self._to_domain(self.db.scalar(stmt))

    def get_by_username(self, username: str) -> Optional[User]:
        stmt = select(UserModel).where(UserModel.username == username)
        return self._to_domain(self.db.scalar(stmt))

    def list(self, *, page: int, page_size: int, search: Optional[str] = None) -> Tuple[list[User], int]:
        stmt = select(UserModel)
        if search:
            like = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    UserModel.email.ilike(like),
                    UserModel.username.ilike(like),
                    UserModel.full_name.ilike(like),
                )
            )
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(UserModel.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return [self._to_domain(r) for r in rows if r], total

    def create(self, entity: User) -> User:
        model = self._to_model(entity)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def update(self, entity: User) -> User:
        model = self.db.get(UserModel, entity.id)
        if model is None:
            raise NotFoundError("User not found.")
        model.email = entity.email
        model.username = entity.username
        model.full_name = entity.full_name
        model.hashed_password = entity.hashed_password
        model.role = entity.role
        model.is_active = entity.is_active
        model.is_superuser = entity.is_superuser
        model.last_login_at = entity.last_login_at
        model.updated_at = entity.updated_at
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def set_last_login(self, entity: User, last_login_at: datetime) -> User:
        model = self.db.get(UserModel, entity.id)
        if model is not None:
            model.last_login_at = last_login_at
            self.db.commit()
            self.db.refresh(model)
            return self._to_domain(model) or entity
        return entity

    def delete(self, entity: User) -> None:
        model = self.db.get(UserModel, entity.id)
        if model is not None:
            self.db.delete(model)
            self.db.commit()

    def count(self) -> int:
        return self.db.scalar(select(func.count()).select_from(UserModel)) or 0

    def count_active(self) -> int:
        return (
            self.db.scalar(
                select(func.count())
                .select_from(UserModel)
                .where(UserModel.is_active.is_(True))
            )
            or 0
        )
