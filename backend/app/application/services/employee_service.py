from __future__ import annotations
import uuid
from typing import Optional, Tuple

from app.application.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.core.exceptions import BadRequestError, ConflictError, NotFoundError
from app.domain.entities.employee import Employee
from app.domain.repositories.employee_repository import EmployeeRepository
from app.shared.utils.helpers import sanitize_text, utc_now


class EmployeeService:
    def __init__(self, employee_repo: EmployeeRepository) -> None:
        self.employee_repo = employee_repo

    def list(
        self,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        department: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Tuple[list[Employee], int]:
        return self.employee_repo.list(
            page=page, page_size=page_size, search=search, department=department, status=status
        )

    def get(self, employee_id: uuid.UUID) -> Employee:
        employee = self.employee_repo.get_by_id(employee_id)
        if employee is None:
            raise NotFoundError("Employee not found.")
        return employee

    def departments(self) -> list[str]:
        return self.employee_repo.departments()

    def create(self, data: EmployeeCreate) -> Employee:
        email = data.email.lower()
        if self.employee_repo.get_by_email(email):
            raise ConflictError("An employee with this email already exists.")
        if data.manager_id is not None:
            self.get(data.manager_id)
        now = utc_now()
        entity = Employee(
            id=uuid.uuid4(),
            user_id=data.user_id,
            first_name=sanitize_text(data.first_name),
            last_name=sanitize_text(data.last_name),
            email=email,
            phone=sanitize_text(data.phone) if data.phone else None,
            department=sanitize_text(data.department),
            position=sanitize_text(data.position),
            salary=data.salary,
            hire_date=data.hire_date,
            status=data.status.value,
            manager_id=data.manager_id,
            address=sanitize_text(data.address) if data.address else None,
            city=sanitize_text(data.city) if data.city else None,
            created_at=now,
            updated_at=now,
        )
        return self.employee_repo.create(entity)

    def update(self, employee_id: uuid.UUID, data: EmployeeUpdate) -> Employee:
        employee = self.get(employee_id)
        provided = data.model_fields_set

        if "email" in provided and data.email is not None:
            candidate = data.email.lower()
            existing = self.employee_repo.get_by_email(candidate)
            if existing is not None and existing.id != employee.id:
                raise ConflictError("An employee with this email already exists.")
            employee.email = candidate

        text_fields = {
            "first_name": data.first_name,
            "last_name": data.last_name,
            "phone": data.phone,
            "department": data.department,
            "position": data.position,
            "address": data.address,
            "city": data.city,
        }
        for field_name, value in text_fields.items():
            if field_name in provided and value is not None:
                setattr(employee, field_name, sanitize_text(value))

        if "manager_id" in provided:
            if data.manager_id is not None:
                if data.manager_id == employee.id:
                    raise BadRequestError("An employee cannot be their own manager.")
                self.get(data.manager_id)
            employee.manager_id = data.manager_id

        if "user_id" in provided:
            employee.user_id = data.user_id
        if "salary" in provided and data.salary is not None:
            employee.salary = data.salary
        if "hire_date" in provided and data.hire_date is not None:
            employee.hire_date = data.hire_date
        if "status" in provided and data.status is not None:
            employee.status = data.status.value

        employee.updated_at = utc_now()
        return self.employee_repo.update(employee)

    def delete(self, employee_id: uuid.UUID) -> None:
        employee = self.get(employee_id)
        employee.is_deleted = True
        employee.deleted_at = utc_now()
        employee.updated_at = utc_now()
        self.employee_repo.soft_delete(employee)
