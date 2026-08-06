from __future__ import annotations
import uuid
from typing import List, Optional, Tuple

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.domain.entities.customer import Customer
from app.domain.repositories.customer_repository import CustomerRepository
from app.infrastructure.models.customer import Customer as CustomerModel


class SQLAlchemyCustomerRepository(CustomerRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_domain(self, model: Optional[CustomerModel]) -> Optional[Customer]:
        if model is None:
            return None
        return Customer(
            id=model.id,
            first_name=model.first_name,
            last_name=model.last_name,
            email=model.email,
            phone=model.phone,
            company=model.company,
            address=model.address,
            city=model.city,
            country=model.country,
            status=model.status,
            total_orders=model.total_orders,
            total_spent=model.total_spent,
            notes=model.notes,
            is_deleted=model.is_deleted,
            deleted_at=model.deleted_at,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def get_by_id(self, customer_id: uuid.UUID, include_deleted: bool = False) -> Optional[Customer]:
        stmt = select(CustomerModel).where(CustomerModel.id == customer_id)
        if not include_deleted:
            stmt = stmt.where(CustomerModel.is_deleted.is_(False))
        return self._to_domain(self.db.scalar(stmt))

    def get_by_email(self, email: str) -> Optional[Customer]:
        stmt = select(CustomerModel).where(CustomerModel.email == email.lower())
        return self._to_domain(self.db.scalar(stmt))

    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        status: Optional[str] = None,
        country: Optional[str] = None,
        include_deleted: bool = False,
    ) -> Tuple[list[Customer], int]:
        stmt = select(CustomerModel)
        if not include_deleted:
            stmt = stmt.where(CustomerModel.is_deleted.is_(False))
        if status:
            stmt = stmt.where(CustomerModel.status == status)
        if country:
            stmt = stmt.where(CustomerModel.country == country)
        if search:
            like = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    CustomerModel.first_name.ilike(like),
                    CustomerModel.last_name.ilike(like),
                    CustomerModel.email.ilike(like),
                    CustomerModel.company.ilike(like),
                    CustomerModel.city.ilike(like),
                )
            )
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(CustomerModel.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return [self._to_domain(r) for r in rows if r], total

    def create(self, entity: Customer) -> Customer:
        model = CustomerModel(
            id=entity.id,
            first_name=entity.first_name,
            last_name=entity.last_name,
            email=entity.email,
            phone=entity.phone,
            company=entity.company,
            address=entity.address,
            city=entity.city,
            country=entity.country,
            status=entity.status,
            total_orders=entity.total_orders,
            total_spent=entity.total_spent,
            notes=entity.notes,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def update(self, entity: Customer) -> Customer:
        model = self.db.get(CustomerModel, entity.id)
        if model is None:
            raise NotFoundError("Customer not found.")
        model.first_name = entity.first_name
        model.last_name = entity.last_name
        model.email = entity.email
        model.phone = entity.phone
        model.company = entity.company
        model.address = entity.address
        model.city = entity.city
        model.country = entity.country
        model.status = entity.status
        model.notes = entity.notes
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def soft_delete(self, entity: Customer) -> Customer:
        model = self.db.get(CustomerModel, entity.id)
        if model is None:
            raise NotFoundError("Customer not found.")
        model.is_deleted = True
        model.deleted_at = entity.deleted_at
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def restore(self, entity: Customer) -> Customer:
        model = self.db.get(CustomerModel, entity.id)
        if model is None:
            raise NotFoundError("Customer not found.")
        model.is_deleted = False
        model.deleted_at = None
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def count(self) -> int:
        return (
            self.db.scalar(
                select(func.count())
                .select_from(CustomerModel)
                .where(CustomerModel.is_deleted.is_(False))
            )
            or 0
        )

    def count_by_status(self, status: str) -> int:
        return (
            self.db.scalar(
                select(func.count())
                .select_from(CustomerModel)
                .where(CustomerModel.is_deleted.is_(False), CustomerModel.status == status)
            )
            or 0
        )

    def top_by_spend(self, limit: int) -> List[Customer]:
        rows = self.db.scalars(
            select(CustomerModel)
            .where(CustomerModel.is_deleted.is_(False))
            .order_by(CustomerModel.total_spent.desc())
            .limit(limit)
        ).all()
        return [self._to_domain(r) for r in rows if r]

    def update_statistics(self, customer_id: uuid.UUID, total_orders: int, total_spent: object) -> None:
        model = self.db.get(CustomerModel, customer_id)
        if model is not None:
            model.total_orders = total_orders
            model.total_spent = total_spent
            self.db.commit()
