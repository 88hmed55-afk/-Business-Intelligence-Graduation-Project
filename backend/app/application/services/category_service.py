from __future__ import annotations
import uuid
from typing import Optional, Tuple

from app.application.schemas.category import CategoryCreate, CategoryUpdate
from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.domain.entities.category import Category
from app.domain.repositories.category_repository import CategoryRepository
from app.shared.utils.helpers import sanitize_text, slugify, utc_now


class CategoryService:
    def __init__(self, category_repo: CategoryRepository) -> None:
        self.category_repo = category_repo

    def list(
        self,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        parent_id: Optional[uuid.UUID] = None,
    ) -> Tuple[list[Category], int]:
        return self.category_repo.list(page=page, page_size=page_size, search=search, parent_id=parent_id)

    def get(self, category_id: uuid.UUID) -> Category:
        category = self.category_repo.get_by_id(category_id)
        if category is None:
            raise NotFoundError("Category not found.")
        return category

    def create(self, data: CategoryCreate) -> Category:
        if data.parent_id is not None:
            parent = self.get(data.parent_id)
            if parent.is_deleted:
                raise BadRequestError("Parent category is deleted.")
        if self.category_repo.get_by_name(data.name):
            raise ConflictError("A category with this name already exists.")
        slug = slugify(data.name)
        if self.category_repo.get_by_slug(slug):
            raise ConflictError("A category with this slug already exists.")
        now = utc_now()
        entity = Category(
            id=uuid.uuid4(),
            name=sanitize_text(data.name),
            slug=slug,
            description=sanitize_text(data.description) if data.description else None,
            parent_id=data.parent_id,
            sort_order=data.sort_order,
            created_at=now,
            updated_at=now,
        )
        return self.category_repo.create(entity)

    def update(self, category_id: uuid.UUID, data: CategoryUpdate) -> Category:
        category = self.get(category_id)
        provided = data.model_fields_set

        if "name" in provided and data.name is not None:
            candidate = sanitize_text(data.name)
            existing = self.category_repo.get_by_name(candidate)
            if existing is not None and existing.id != category.id:
                raise ConflictError("A category with this name already exists.")
            category.name = candidate
            new_slug = slugify(candidate)
            existing_slug = self.category_repo.get_by_slug(new_slug)
            if existing_slug is not None and existing_slug.id != category.id:
                raise ConflictError("A category with this slug already exists.")
            category.slug = new_slug

        if "description" in provided:
            category.description = sanitize_text(data.description) if data.description else None

        if "parent_id" in provided:
            if data.parent_id is not None:
                if data.parent_id == category.id:
                    raise BadRequestError("A category cannot be its own parent.")
                self.get(data.parent_id)
            category.parent_id = data.parent_id

        if "sort_order" in provided and data.sort_order is not None:
            category.sort_order = data.sort_order

        category.updated_at = utc_now()
        return self.category_repo.update(category)

    def delete(self, category_id: uuid.UUID) -> None:
        category = self.get(category_id)
        category.is_deleted = True
        category.deleted_at = utc_now()
        category.updated_at = utc_now()
        self.category_repo.soft_delete(category)
