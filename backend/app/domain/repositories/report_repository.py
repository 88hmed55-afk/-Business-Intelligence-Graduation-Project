from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional, Tuple

from app.domain.entities.report import Report


class ReportRepository(ABC):
    """Contract for report persistence."""

    @abstractmethod
    def get_by_id(self, report_id: uuid.UUID) -> Optional[Report]: ...

    @abstractmethod
    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        owner_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
    ) -> Tuple[list[Report], int]: ...

    @abstractmethod
    def create(self, entity: Report) -> Report: ...

    @abstractmethod
    def update(self, entity: Report) -> Report: ...

    @abstractmethod
    def delete(self, entity: Report) -> None: ...

    @abstractmethod
    def count(self) -> int: ...

    @abstractmethod
    def count_by_status(self, status: str) -> int: ...
