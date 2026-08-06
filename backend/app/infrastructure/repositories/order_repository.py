from __future__ import annotations
import uuid
from typing import List, Optional, Tuple

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.domain.entities.order import Order, OrderItem
from app.domain.repositories.order_repository import OrderRepository
from app.infrastructure.models.order import Order as OrderModel
from app.infrastructure.models.order import OrderItem as OrderItemModel


class SQLAlchemyOrderRepository(OrderRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def _item_to_domain(self, model: Optional[OrderItemModel]) -> Optional[OrderItem]:
        if model is None:
            return None
        return OrderItem(
            id=model.id,
            order_id=model.order_id,
            product_id=model.product_id,
            quantity=model.quantity,
            unit_price=model.unit_price,
            line_total=model.line_total,
            discount_amount=model.discount_amount,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _to_domain(self, model: Optional[OrderModel]) -> Optional[Order]:
        if model is None:
            return None
        return Order(
            id=model.id,
            order_number=model.order_number,
            customer_id=model.customer_id,
            status=model.status,
            subtotal=model.subtotal,
            discount_amount=model.discount_amount,
            tax_amount=model.tax_amount,
            shipping_fee=model.shipping_fee,
            total_amount=model.total_amount,
            currency=model.currency,
            payment_status=model.payment_status,
            order_date=model.order_date,
            delivered_at=model.delivered_at,
            notes=model.notes,
            items=[self._item_to_domain(i) for i in model.items if i is not None],
            is_deleted=model.is_deleted,
            deleted_at=model.deleted_at,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def _item_models(self, order: Order) -> List[OrderItemModel]:
        return [
            OrderItemModel(
                id=item.id,
                order_id=item.order_id,
                product_id=item.product_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                line_total=item.line_total,
                discount_amount=item.discount_amount,
            )
            for item in order.items
        ]

    def get_by_id(self, order_id: uuid.UUID) -> Optional[Order]:
        return self._to_domain(self.db.get(OrderModel, order_id))

    def get_by_number(self, order_number: str) -> Optional[Order]:
        stmt = select(OrderModel).where(OrderModel.order_number == order_number)
        return self._to_domain(self.db.scalar(stmt))

    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        customer_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        payment_status: Optional[str] = None,
        date_from: Optional[object] = None,
        date_to: Optional[object] = None,
        include_deleted: bool = False,
    ) -> Tuple[list[Order], int]:
        stmt = select(OrderModel)
        if not include_deleted:
            stmt = stmt.where(OrderModel.is_deleted.is_(False))
        if customer_id is not None:
            stmt = stmt.where(OrderModel.customer_id == customer_id)
        if status:
            stmt = stmt.where(OrderModel.status == status)
        if payment_status:
            stmt = stmt.where(OrderModel.payment_status == payment_status)
        if date_from is not None:
            stmt = stmt.where(OrderModel.order_date >= date_from)
        if date_to is not None:
            stmt = stmt.where(OrderModel.order_date <= date_to)
        if search:
            like = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(OrderModel.order_number.ilike(like), OrderModel.currency.ilike(like))
            )
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(OrderModel.order_date.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return [self._to_domain(r) for r in rows if r], total

    def create(self, entity: Order) -> Order:
        model = OrderModel(
            id=entity.id,
            order_number=entity.order_number,
            customer_id=entity.customer_id,
            status=entity.status,
            subtotal=entity.subtotal,
            discount_amount=entity.discount_amount,
            tax_amount=entity.tax_amount,
            shipping_fee=entity.shipping_fee,
            total_amount=entity.total_amount,
            currency=entity.currency,
            payment_status=entity.payment_status,
            order_date=entity.order_date,
            delivered_at=entity.delivered_at,
            notes=entity.notes,
        )
        for item in self._item_models(entity):
            model.items.append(item)
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def update(self, entity: Order) -> Order:
        model = self.db.get(OrderModel, entity.id)
        if model is None:
            raise NotFoundError("Order not found.")
        model.customer_id = entity.customer_id
        model.status = entity.status
        model.subtotal = entity.subtotal
        model.discount_amount = entity.discount_amount
        model.tax_amount = entity.tax_amount
        model.shipping_fee = entity.shipping_fee
        model.total_amount = entity.total_amount
        model.currency = entity.currency
        model.payment_status = entity.payment_status
        model.order_date = entity.order_date
        model.delivered_at = entity.delivered_at
        model.notes = entity.notes
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def soft_delete(self, entity: Order) -> Order:
        model = self.db.get(OrderModel, entity.id)
        if model is None:
            raise NotFoundError("Order not found.")
        model.is_deleted = True
        model.deleted_at = entity.deleted_at
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def count(self) -> int:
        return (
            self.db.scalar(
                select(func.count()).select_from(OrderModel).where(OrderModel.is_deleted.is_(False))
            )
            or 0
        )

    def count_by_status(self, status: str) -> int:
        return (
            self.db.scalar(
                select(func.count())
                .select_from(OrderModel)
                .where(OrderModel.is_deleted.is_(False), OrderModel.status == status)
            )
            or 0
        )

    def revenue(self) -> object:
        return self.db.scalar(
            select(func.coalesce(func.sum(OrderModel.total_amount), 0)).where(
                OrderModel.is_deleted.is_(False),
                OrderModel.status.notin_(["cancelled", "refunded"]),
            )
        )

    def customer_totals(self, customer_id: uuid.UUID) -> Tuple[int, object]:
        stmt = select(
            func.count(),
            func.coalesce(func.sum(OrderModel.total_amount), 0),
        ).where(
            OrderModel.customer_id == customer_id,
            OrderModel.is_deleted.is_(False),
            OrderModel.status.notin_(["cancelled", "refunded"]),
        )
        row = self.db.execute(stmt).one()
        return int(row[0] or 0), row[1]
