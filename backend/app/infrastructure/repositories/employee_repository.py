from __future__ import annotations
import uuid
from typing import Optional, Tuple

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.domain.entities.employee import Employee
from app.domain.repositories.employee_repository import EmployeeRepository
from app.infrastructure.models.employee import Employee as EmployeeModel


class SQLAlchemyEmployeeRepository(EmployeeRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_domain(self, model: Optional[EmployeeModel]) -> Optional[Employee]:
        if model is None:
            return None
        return Employee(
            id=model.id,
            user_id=model.user_id,
            first_name=model.first_name,
            last_name=model.last_name,
            email=model.email,
            phone=model.phone,
            department=model.department,
            position=model.position,
            salary=model.salary,
            hire_date=model.hire_date,
            status=model.status,
            manager_id=model.manager_id,
            address=model.address,
            city=model.city,
            is_deleted=model.is_deleted,
            deleted_at=model.deleted_at,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def get_by_id(self, employee_id: uuid.UUID) -> Optional[Employee]:
        return self._to_domain(self.db.get(EmployeeModel, employee_id))

    def get_by_email(self, email: str) -> Optional[Employee]:
        stmt = select(EmployeeModel).where(EmployeeModel.email == email.lower())
        return self._to_domain(self.db.scalar(stmt))

    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        department: Optional[str] = None,
        status: Optional[str] = None,
        include_deleted: bool = False,
    ) -> Tuple[list[Employee], int]:
        stmt = select(EmployeeModel)
        if not include_deleted:
            stmt = stmt.where(EmployeeModel.is_deleted.is_(False))
        if department:
            stmt = stmt.where(EmployeeModel.department == department)
        if status:
            stmt = stmt.where(EmployeeModel.status == status)
        if search:
            like = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    EmployeeModel.first_name.ilike(like),
                    EmployeeModel.last_name.ilike(like),
                    EmployeeModel.email.ilike(like),
                    EmployeeModel.position.ilike(like),
                )
            )
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(EmployeeModel.hire_date.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return [self._to_domain(r) for r in rows if r], total

    def create(self, entity: Employee) -> Employee:
        model = EmployeeModel(
            id=entity.id,
            user_id=entity.user_id,
            first_name=entity.first_name,
            last_name=entity.last_name,
            email=entity.email,
            phone=entity.phone,
            department=entity.department,
            position=entity.position,
            salary=entity.salary,
            hire_date=entity.hire_date,
            status=entity.status,
            manager_id=entity.manager_id,
            address=entity.address,
            city=entity.city,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def update(self, entity: Employee) -> Employee:
        model = self.db.get(EmployeeModel, entity.id)
        if model is None:
            raise NotFoundError("Employee not found.")
        model.user_id = entity.user_id
        model.first_name = entity.first_name
        model.last_name = entity.last_name
        model.email = entity.email
        model.phone = entity.phone
        model.department = entity.department
        model.position = entity.position
        model.salary = entity.salary
        model.hire_date = entity.hire_date
        model.status = entity.status
        model.manager_id = entity.manager_id
        model.address = entity.address
        model.city = entity.city
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def soft_delete(self, entity: Employee) -> Employee:
        model = self.db.get(EmployeeModel, entity.id)
        if model is None:
            raise NotFoundError("Employee not found.")
        model.is_deleted = True
        model.deleted_at = entity.deleted_at
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def count(self) -> int:
        return (
            self.db.scalar(
                select(func.count())
                .select_from(EmployeeModel)
                .where(EmployeeModel.is_deleted.is_(False))
            )
            or 0
        )

    def count_by_department(self, department: str) -> int:
        return (
            self.db.scalar(
                select(func.count())
                .select_from(EmployeeModel)
                .where(EmployeeModel.is_deleted.is_(False), EmployeeModel.department == department)
            )
            or 0
        )

    def departments(self) -> list[str]:
        rows = self.db.scalars(
            select(EmployeeModel.department)
            .where(EmployeeModel.is_deleted.is_(False))
            .distinct()
            .order_by(EmployeeModel.department.asc())
        ).all()
        return [r for r in rows if r]
