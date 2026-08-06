from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional, Tuple

from app.domain.entities.dashboard import Dashboard


class DashboardRepository(ABC):
    """Contract for dashboard persistence."""

    @abstractmethod
    def get_by_id(self, dashboard_id: uuid.UUID) -> Optional[Dashboard]: ...

    @abstractmethod
    def get_by_slug(self, slug: str) -> Optional[Dashboard]: ...

    @abstractmethod
    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        owner_id: Optional[uuid.UUID] = None,
        include_public: bool = False,
        is_favorite: Optional[bool] = None,
    ) -> Tuple[list[Dashboard], int]: ...

    @abstractmethod
    def create(self, entity: Dashboard) -> Dashboard: ...

    @abstractmethod
    def update(self, entity: Dashboard) -> Dashboard: ...

    @abstractmethod
    def delete(self, entity: Dashboard) -> None: ...

    @abstractmethod
    def count(self) -> int: ...
