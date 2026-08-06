from __future__ import annotations
import uuid
from typing import Optional, Tuple

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.domain.entities.category import Category
from app.domain.repositories.category_repository import CategoryRepository
from app.infrastructure.models.category import Category as CategoryModel


class SQLAlchemyCategoryRepository(CategoryRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_domain(self, model: Optional[CategoryModel]) -> Optional[Category]:
        if model is None:
            return None
        return Category(
            id=model.id,
            name=model.name,
            slug=model.slug,
            description=model.description,
            parent_id=model.parent_id,
            sort_order=model.sort_order,
            is_deleted=model.is_deleted,
            deleted_at=model.deleted_at,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def get_by_id(self, category_id: uuid.UUID) -> Optional[Category]:
        return self._to_domain(self.db.get(CategoryModel, category_id))

    def get_by_name(self, name: str) -> Optional[Category]:
        stmt = select(CategoryModel).where(CategoryModel.name == name)
        return self._to_domain(self.db.scalar(stmt))

    def get_by_slug(self, slug: str) -> Optional[Category]:
        stmt = select(CategoryModel).where(CategoryModel.slug == slug)
        return self._to_domain(self.db.scalar(stmt))

    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        parent_id: Optional[uuid.UUID] = None,
        include_deleted: bool = False,
    ) -> Tuple[list[Category], int]:
        stmt = select(CategoryModel)
        if not include_deleted:
            stmt = stmt.where(CategoryModel.is_deleted.is_(False))
        if parent_id is not None:
            stmt = stmt.where(CategoryModel.parent_id == parent_id)
        if search:
            like = f"%{search.strip()}%"
            stmt = stmt.where(or_(CategoryModel.name.ilike(like), CategoryModel.description.ilike(like)))
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(CategoryModel.sort_order.asc(), CategoryModel.name.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return [self._to_domain(r) for r in rows if r], total

    def create(self, entity: Category) -> Category:
        model = CategoryModel(
            id=entity.id,
            name=entity.name,
            slug=entity.slug,
            description=entity.description,
            parent_id=entity.parent_id,
            sort_order=entity.sort_order,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def update(self, entity: Category) -> Category:
        model = self.db.get(CategoryModel, entity.id)
        if model is None:
            raise NotFoundError("Category not found.")
        model.name = entity.name
        model.slug = entity.slug
        model.description = entity.description
        model.parent_id = entity.parent_id
        model.sort_order = entity.sort_order
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def soft_delete(self, entity: Category) -> Category:
        model = self.db.get(CategoryModel, entity.id)
        if model is None:
            raise NotFoundError("Category not found.")
        model.is_deleted = True
        model.deleted_at = entity.deleted_at
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def count(self) -> int:
        return (
            self.db.scalar(
                select(func.count())
                .select_from(CategoryModel)
                .where(CategoryModel.is_deleted.is_(False))
            )
            or 0
        )
