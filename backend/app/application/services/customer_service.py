from __future__ import annotations
import uuid
from typing import Optional, Tuple

from app.application.schemas.customer import CustomerCreate, CustomerUpdate
from app.core.exceptions import ConflictError, NotFoundError
from app.domain.entities.customer import Customer
from app.domain.repositories.customer_repository import CustomerRepository
from app.shared.utils.helpers import sanitize_text, utc_now


class CustomerService:
    def __init__(self, customer_repo: CustomerRepository) -> None:
        self.customer_repo = customer_repo

    def list(
        self,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        status: Optional[str] = None,
        country: Optional[str] = None,
    ) -> Tuple[list[Customer], int]:
        return self.customer_repo.list(
            page=page, page_size=page_size, search=search, status=status, country=country
        )

    def get(self, customer_id: uuid.UUID) -> Customer:
        customer = self.customer_repo.get_by_id(customer_id)
        if customer is None:
            raise NotFoundError("Customer not found.")
        return customer

    def create(self, data: CustomerCreate) -> Customer:
        email = data.email.lower() if data.email else None
        if email and self.customer_repo.get_by_email(email):
            raise ConflictError("A customer with this email already exists.")
        now = utc_now()
        entity = Customer(
            id=uuid.uuid4(),
            first_name=sanitize_text(data.first_name),
            last_name=sanitize_text(data.last_name),
            email=email,
            phone=sanitize_text(data.phone) if data.phone else None,
            company=sanitize_text(data.company) if data.company else None,
            address=sanitize_text(data.address) if data.address else None,
            city=sanitize_text(data.city) if data.city else None,
            country=sanitize_text(data.country) if data.country else None,
            status=data.status.value,
            notes=sanitize_text(data.notes) if data.notes else None,
            created_at=now,
            updated_at=now,
        )
        return self.customer_repo.create(entity)

    def update(self, customer_id: uuid.UUID, data: CustomerUpdate) -> Customer:
        customer = self.get(customer_id)
        provided = data.model_fields_set

        if "email" in provided and data.email is not None:
            candidate = data.email.lower()
            existing = self.customer_repo.get_by_email(candidate)
            if existing is not None and existing.id != customer.id:
                raise ConflictError("A customer with this email already exists.")
            customer.email = candidate

        fields = {
            "first_name": data.first_name,
            "last_name": data.last_name,
            "phone": data.phone,
            "company": data.company,
            "address": data.address,
            "city": data.city,
            "country": data.country,
            "notes": data.notes,
        }
        for field_name, value in fields.items():
            if field_name in provided and value is not None:
                setattr(customer, field_name, sanitize_text(value))

        if "status" in provided and data.status is not None:
            customer.status = data.status.value

        customer.updated_at = utc_now()
        return self.customer_repo.update(customer)

    def delete(self, customer_id: uuid.UUID) -> None:
        customer = self.get(customer_id)
        customer.is_deleted = True
        customer.deleted_at = utc_now()
        customer.updated_at = utc_now()
        self.customer_repo.soft_delete(customer)

    def restore(self, customer_id: uuid.UUID) -> Customer:
        customer = self.customer_repo.get_by_id(customer_id, include_deleted=True)
        if customer is None:
            raise NotFoundError("Customer not found.")
        customer.is_deleted = False
        customer.deleted_at = None
        customer.updated_at = utc_now()
        return self.customer_repo.restore(customer)
