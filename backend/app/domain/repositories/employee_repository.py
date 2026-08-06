from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Optional, Tuple

from app.domain.entities.employee import Employee


class EmployeeRepository(ABC):
    """Contract for employee persistence."""

    @abstractmethod
    def get_by_id(self, employee_id: uuid.UUID) -> Optional[Employee]: ...

    @abstractmethod
    def get_by_email(self, email: str) -> Optional[Employee]: ...

    @abstractmethod
    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        department: Optional[str] = None,
        status: Optional[str] = None,
        include_deleted: bool = False,
    ) -> Tuple[list[Employee], int]: ...

    @abstractmethod
    def create(self, entity: Employee) -> Employee: ...

    @abstractmethod
    def update(self, entity: Employee) -> Employee: ...

    @abstractmethod
    def soft_delete(self, entity: Employee) -> Employee: ...

    @abstractmethod
    def count(self) -> int: ...

    @abstractmethod
    def count_by_department(self, department: str) -> int: ...

    @abstractmethod
    def departments(self) -> list[str]: ...
