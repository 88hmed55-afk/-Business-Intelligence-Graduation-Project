from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional, Tuple

from app.domain.entities.category import Category


class CategoryRepository(ABC):
    """Contract for category persistence."""

    @abstractmethod
    def get_by_id(self, category_id: uuid.UUID) -> Optional[Category]: ...

    @abstractmethod
    def get_by_name(self, name: str) -> Optional[Category]: ...

    @abstractmethod
    def get_by_slug(self, slug: str) -> Optional[Category]: ...

    @abstractmethod
    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        parent_id: Optional[uuid.UUID] = None,
        include_deleted: bool = False,
    ) -> Tuple[list[Category], int]: ...

    @abstractmethod
    def create(self, entity: Category) -> Category: ...

    @abstractmethod
    def update(self, entity: Category) -> Category: ...

    @abstractmethod
    def soft_delete(self, entity: Category) -> Category: ...

    @abstractmethod
    def count(self) -> int: ...
