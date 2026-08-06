from __future__ import annotations
import uuid
from typing import Optional, Tuple

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.domain.entities.supplier import Supplier
from app.domain.repositories.supplier_repository import SupplierRepository
from app.infrastructure.models.supplier import Supplier as SupplierModel


class SQLAlchemySupplierRepository(SupplierRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_domain(self, model: Optional[SupplierModel]) -> Optional[Supplier]:
        if model is None:
            return None
        return Supplier(
            id=model.id,
            name=model.name,
            contact_name=model.contact_name,
            email=model.email,
            phone=model.phone,
            address=model.address,
            city=model.city,
            country=model.country,
            tax_id=model.tax_id,
            website=model.website,
            is_active=model.is_active,
            is_deleted=model.is_deleted,
            deleted_at=model.deleted_at,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def get_by_id(self, supplier_id: uuid.UUID) -> Optional[Supplier]:
        return self._to_domain(self.db.get(SupplierModel, supplier_id))

    def get_by_name(self, name: str) -> Optional[Supplier]:
        stmt = select(SupplierModel).where(SupplierModel.name == name)
        return self._to_domain(self.db.scalar(stmt))

    def get_by_email(self, email: str) -> Optional[Supplier]:
        stmt = select(SupplierModel).where(
            SupplierModel.email == email.lower(), SupplierModel.is_deleted.is_(False)
        )
        return self._to_domain(self.db.scalar(stmt))

    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        country: Optional[str] = None,
        is_active: Optional[bool] = None,
        include_deleted: bool = False,
    ) -> Tuple[list[Supplier], int]:
        stmt = select(SupplierModel)
        if not include_deleted:
            stmt = stmt.where(SupplierModel.is_deleted.is_(False))
        if country:
            stmt = stmt.where(SupplierModel.country == country)
        if is_active is not None:
            stmt = stmt.where(SupplierModel.is_active.is_(is_active))
        if search:
            like = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    SupplierModel.name.ilike(like),
                    SupplierModel.contact_name.ilike(like),
                    SupplierModel.email.ilike(like),
                    SupplierModel.city.ilike(like),
                )
            )
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(SupplierModel.name.asc()).offset((page - 1) * page_size).limit(page_size)
        ).all()
        return [self._to_domain(r) for r in rows if r], total

    def create(self, entity: Supplier) -> Supplier:
        model = SupplierModel(
            id=entity.id,
            name=entity.name,
            contact_name=entity.contact_name,
            email=entity.email,
            phone=entity.phone,
            address=entity.address,
            city=entity.city,
            country=entity.country,
            tax_id=entity.tax_id,
            website=entity.website,
            is_active=entity.is_active,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def update(self, entity: Supplier) -> Supplier:
        model = self.db.get(SupplierModel, entity.id)
        if model is None:
            raise NotFoundError("Supplier not found.")
        model.name = entity.name
        model.contact_name = entity.contact_name
        model.email = entity.email
        model.phone = entity.phone
        model.address = entity.address
        model.city = entity.city
        model.country = entity.country
        model.tax_id = entity.tax_id
        model.website = entity.website
        model.is_active = entity.is_active
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def soft_delete(self, entity: Supplier) -> Supplier:
        model = self.db.get(SupplierModel, entity.id)
        if model is None:
            raise NotFoundError("Supplier not found.")
        model.is_deleted = True
        model.deleted_at = entity.deleted_at
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def count(self) -> int:
        return (
            self.db.scalar(
                select(func.count())
                .select_from(SupplierModel)
                .where(SupplierModel.is_deleted.is_(False))
            )
            or 0
        )
