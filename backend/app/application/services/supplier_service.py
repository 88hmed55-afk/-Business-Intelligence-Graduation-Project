from __future__ import annotations
import uuid
from typing import Optional, Tuple

from app.application.schemas.supplier import SupplierCreate, SupplierUpdate
from app.core.exceptions import ConflictError, NotFoundError
from app.domain.entities.supplier import Supplier
from app.domain.repositories.supplier_repository import SupplierRepository
from app.shared.utils.helpers import sanitize_text, utc_now


class SupplierService:
    def __init__(self, supplier_repo: SupplierRepository) -> None:
        self.supplier_repo = supplier_repo

    def list(
        self,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        country: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[list[Supplier], int]:
        return self.supplier_repo.list(
            page=page, page_size=page_size, search=search, country=country, is_active=is_active
        )

    def get(self, supplier_id: uuid.UUID) -> Supplier:
        supplier = self.supplier_repo.get_by_id(supplier_id)
        if supplier is None:
            raise NotFoundError("Supplier not found.")
        return supplier

    def create(self, data: SupplierCreate) -> Supplier:
        if self.supplier_repo.get_by_name(data.name):
            raise ConflictError("A supplier with this name already exists.")
        if data.email and self.supplier_repo.get_by_email(data.email):
            raise ConflictError("A supplier with this email already exists.")
        now = utc_now()
        entity = Supplier(
            id=uuid.uuid4(),
            name=sanitize_text(data.name),
            contact_name=sanitize_text(data.contact_name) if data.contact_name else None,
            email=data.email.lower() if data.email else None,
            phone=sanitize_text(data.phone) if data.phone else None,
            address=sanitize_text(data.address) if data.address else None,
            city=sanitize_text(data.city) if data.city else None,
            country=sanitize_text(data.country) if data.country else None,
            tax_id=sanitize_text(data.tax_id) if data.tax_id else None,
            website=sanitize_text(data.website) if data.website else None,
            is_active=data.is_active,
            created_at=now,
            updated_at=now,
        )
        return self.supplier_repo.create(entity)

    def update(self, supplier_id: uuid.UUID, data: SupplierUpdate) -> Supplier:
        supplier = self.get(supplier_id)
        provided = data.model_fields_set

        if "name" in provided and data.name is not None:
            candidate = sanitize_text(data.name)
            existing = self.supplier_repo.get_by_name(candidate)
            if existing is not None and existing.id != supplier.id:
                raise ConflictError("A supplier with this name already exists.")
            supplier.name = candidate

        fields = {
            "contact_name": data.contact_name,
            "phone": data.phone,
            "address": data.address,
            "city": data.city,
            "country": data.country,
            "tax_id": data.tax_id,
            "website": data.website,
        }
        for field_name, value in fields.items():
            if field_name in provided:
                setattr(supplier, field_name, sanitize_text(value) if value else None)

        if "email" in provided:
            if data.email is not None:
                candidate = data.email.lower()
                existing = self.supplier_repo.get_by_email(candidate)
                if existing is not None and existing.id != supplier.id:
                    raise ConflictError("A supplier with this email already exists.")
                supplier.email = candidate
            else:
                supplier.email = None

        if "is_active" in provided and data.is_active is not None:
            supplier.is_active = data.is_active

        supplier.updated_at = utc_now()
        return self.supplier_repo.update(supplier)

    def delete(self, supplier_id: uuid.UUID) -> None:
        supplier = self.get(supplier_id)
        supplier.is_deleted = True
        supplier.deleted_at = utc_now()
        supplier.updated_at = utc_now()
        self.supplier_repo.soft_delete(supplier)
