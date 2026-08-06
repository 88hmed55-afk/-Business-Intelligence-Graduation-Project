from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Tuple

from app.domain.entities.kpi import KPI


class KpiRepository(ABC):
    """Contract for KPI persistence."""

    @abstractmethod
    def get_by_id(self, kpi_id: uuid.UUID) -> Optional[KPI]: ...

    @abstractmethod
    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        owner_id: Optional[uuid.UUID] = None,
        category: Optional[str] = None,
        dashboard_id: Optional[uuid.UUID] = None,
    ) -> Tuple[list[KPI], int]: ...

    @abstractmethod
    def create(self, entity: KPI) -> KPI: ...

    @abstractmethod
    def update(self, entity: KPI) -> KPI: ...

    @abstractmethod
    def delete(self, entity: KPI) -> None: ...

    @abstractmethod
    def count(self) -> int: ...

    @abstractmethod
    def counts_by_dashboard(self, dashboard_ids: list[uuid.UUID]) -> Dict[uuid.UUID, int]: ...

    @abstractmethod
    def aggregate_by_category(self) -> list[Dict[str, Any]]: ...
