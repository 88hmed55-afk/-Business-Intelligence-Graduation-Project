import uuid
from typing import Optional, Tuple

from app.application.schemas.user import SelfUpdateRequest, UserCreate, UserUpdate
from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.core.security import hash_password
from app.domain.entities.user import User
from app.domain.repositories.user_repository import UserRepository
from app.shared.enums import UserRole
from app.shared.utils.helpers import utc_now


class UserService:
    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    def list(self, page: int, page_size: int, search: Optional[str] = None) -> Tuple[list[User], int]:
        return self.user_repo.list(page=page, page_size=page_size, search=search)

    def get(self, user_id: uuid.UUID) -> User:
        user = self.user_repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found.")
        return user

    def create(self, data: UserCreate) -> User:
        email = data.email.lower()
        if self.user_repo.get_by_email(email):
            raise ConflictError("A user with this email already exists.")
        if self.user_repo.get_by_username(data.username):
            raise ConflictError("This username is already taken.")

        now = utc_now()
        entity = User(
            id=uuid.uuid4(),
            email=email,
            username=data.username,
            full_name=data.full_name,
            hashed_password=hash_password(data.password),
            role=data.role.value,
            is_active=True,
            is_superuser=data.role is UserRole.ADMIN,
            created_at=now,
            updated_at=now,
        )
        return self.user_repo.create(entity)

    def update(self, user_id: uuid.UUID, data: UserUpdate, actor: User) -> User:
        user = self.user_repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found.")

        if actor.id == user.id and data.is_active is False:
            raise BadRequestError("You cannot deactivate your own account.")
        if actor.id == user.id and data.role is not None and data.role is not UserRole.ADMIN and user.role == UserRole.ADMIN.value:
            raise BadRequestError("You cannot remove your own administrator role.")

        provided = data.model_fields_set

        if "email" in provided and data.email is not None:
            candidate = data.email.lower()
            existing = self.user_repo.get_by_email(candidate)
            if existing is not None and existing.id != user.id:
                raise ConflictError("A user with this email already exists.")
            user.email = candidate

        if "username" in provided and data.username is not None:
            existing = self.user_repo.get_by_username(data.username)
            if existing is not None and existing.id != user.id:
                raise ConflictError("This username is already taken.")
            user.username = data.username

        if "full_name" in provided and data.full_name is not None:
            user.full_name = data.full_name

        if "role" in provided and data.role is not None:
            user.role = data.role.value
            user.is_superuser = data.role is UserRole.ADMIN

        if "is_active" in provided and data.is_active is not None:
            user.is_active = data.is_active

        if "is_superuser" in provided and data.is_superuser is not None:
            user.is_superuser = data.is_superuser

        if "password" in provided and data.password:
            user.hashed_password = hash_password(data.password)

        user.updated_at = utc_now()
        return self.user_repo.update(user)

    def update_self(self, current_user: User, data: SelfUpdateRequest) -> User:
        provided = data.model_fields_set

        if "email" in provided and data.email is not None:
            candidate = data.email.lower()
            existing = self.user_repo.get_by_email(candidate)
            if existing is not None and existing.id != current_user.id:
                raise ConflictError("A user with this email already exists.")
            current_user.email = candidate

        if "username" in provided and data.username is not None:
            existing = self.user_repo.get_by_username(data.username)
            if existing is not None and existing.id != current_user.id:
                raise ConflictError("This username is already taken.")
            current_user.username = data.username

        if "full_name" in provided and data.full_name is not None:
            current_user.full_name = data.full_name

        current_user.updated_at = utc_now()
        return self.user_repo.update(current_user)

    def delete(self, user_id: uuid.UUID, actor: User) -> None:
        user = self.user_repo.get_by_id(user_id)
        if user is None:
            raise NotFoundError("User not found.")
        if user.id == actor.id:
            raise BadRequestError("You cannot delete your own account.")
        self.user_repo.delete(user)
