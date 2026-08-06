from __future__ import annotations
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, Tuple

from app.application.schemas.order import OrderCreate, OrderItemCreate, OrderUpdate
from app.core.exceptions import BadRequestError, NotFoundError
from app.domain.entities.order import Order, OrderItem
from app.domain.repositories.customer_repository import CustomerRepository
from app.domain.repositories.inventory_repository import InventoryRepository
from app.domain.repositories.order_repository import OrderRepository
from app.domain.repositories.product_repository import ProductRepository
from app.shared.utils.helpers import sanitize_text, utc_now

TAX_RATE = Decimal("0.075")
_CONSUMES_STOCK = ("pending", "processing", "shipped", "delivered")
_RETURNS_STOCK = ("cancelled", "refunded")


class OrderService:
    def __init__(
        self,
        order_repo: OrderRepository,
        customer_repo: CustomerRepository,
        product_repo: ProductRepository,
        inventory_repo: InventoryRepository,
    ) -> None:
        self.order_repo = order_repo
        self.customer_repo = customer_repo
        self.product_repo = product_repo
        self.inventory_repo = inventory_repo

    def list(
        self,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        customer_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        payment_status: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
    ) -> Tuple[list[Order], int]:
        return self.order_repo.list(
            page=page,
            page_size=page_size,
            search=search,
            customer_id=customer_id,
            status=status,
            payment_status=payment_status,
            date_from=date_from,
            date_to=date_to,
        )

    def get(self, order_id: uuid.UUID) -> Order:
        order = self.order_repo.get_by_id(order_id)
        if order is None:
            raise NotFoundError("Order not found.")
        return order

    def _resolve_item(self, item: OrderItemCreate) -> tuple[OrderItem, object]:
        product = self.product_repo.get_by_id(item.product_id)
        if product is None or product.is_deleted:
            raise NotFoundError(f"Product {item.product_id} not found.")
        if not product.is_active:
            raise BadRequestError(f"Product '{product.name}' is inactive.")
        unit_price = item.unit_price if item.unit_price is not None else product.unit_price
        quantity = item.quantity
        discount = item.discount_amount or Decimal("0")
        line_total = (unit_price * quantity) - discount
        if line_total < 0:
            raise BadRequestError("Line total cannot be negative.")
        order_item = OrderItem(
            id=uuid.uuid4(),
            order_id=uuid.uuid4(),
            product_id=product.id,
            quantity=quantity,
            unit_price=unit_price,
            discount_amount=discount,
            line_total=line_total,
        )
        return order_item, product

    def create(self, data: OrderCreate) -> Order:
        customer = self.customer_repo.get_by_id(data.customer_id)
        if customer is None or customer.is_deleted:
            raise NotFoundError("Customer not found.")

        items: list[OrderItem] = []
        for spec in data.items:
            order_item, _ = self._resolve_item(spec)
            items.append(order_item)

        subtotal = sum((i.line_total for i in items), Decimal("0"))
        discount_total = sum((i.discount_amount for i in items), Decimal("0"))
        tax_amount = round(subtotal * TAX_RATE, 2)
        total_amount = subtotal + tax_amount + data.shipping_fee

        now = utc_now()
        order = Order(
            id=uuid.uuid4(),
            order_number=self._generate_number("ORD"),
            customer_id=data.customer_id,
            status=data.status.value,
            subtotal=subtotal,
            discount_amount=discount_total,
            tax_amount=tax_amount,
            shipping_fee=data.shipping_fee,
            total_amount=total_amount,
            currency=data.currency.upper(),
            payment_status="unpaid",
            order_date=now,
            delivered_at=now if data.status.value == "delivered" else None,
            notes=sanitize_text(data.notes) if data.notes else None,
            created_at=now,
            updated_at=now,
        )
        order.items = items
        for i in items:
            i.order_id = order.id

        created = self.order_repo.create(order)

        if created.status in _CONSUMES_STOCK:
            self._deduct_stock(created, created.items)
        self._refresh_customer_stats(created.customer_id)
        return created

    def update(self, order_id: uuid.UUID, data: OrderUpdate) -> Order:
        order = self.get(order_id)
        old_status = order.status
        old_customer_id = order.customer_id
        provided = data.model_fields_set

        if "customer_id" in provided and data.customer_id is not None:
            customer = self.customer_repo.get_by_id(data.customer_id)
            if customer is None or customer.is_deleted:
                raise NotFoundError("Customer not found.")
            order.customer_id = data.customer_id

        if "status" in provided and data.status is not None:
            order.status = data.status.value
            if data.status.value == "delivered":
                order.delivered_at = utc_now()
            if data.status.value in ("pending", "processing", "shipped"):
                order.delivered_at = None

        if "currency" in provided and data.currency is not None:
            order.currency = data.currency.upper()

        if "shipping_fee" in provided and data.shipping_fee is not None:
            order.shipping_fee = data.shipping_fee
            order.total_amount = order.subtotal + order.tax_amount + order.shipping_fee

        if "notes" in provided:
            order.notes = sanitize_text(data.notes) if data.notes else None

        order.updated_at = utc_now()
        updated = self.order_repo.update(order)

        self._sync_stock(updated, updated.items, old_status)
        if old_customer_id != updated.customer_id:
            self._refresh_customer_stats(old_customer_id)
        self._refresh_customer_stats(updated.customer_id)
        return updated

    def delete(self, order_id: uuid.UUID) -> None:
        order = self.get(order_id)
        if order.status in _CONSUMES_STOCK:
            self._restock(order, order.items)
        order.is_deleted = True
        order.deleted_at = utc_now()
        order.updated_at = utc_now()
        self.order_repo.soft_delete(order)
        self._refresh_customer_stats(order.customer_id)

    # ------------------------------------------------------------------
    # Presentation enrichment (names resolution)
    # ------------------------------------------------------------------
    def decorate(self, order: Order) -> dict:
        from app.application.schemas.order import OrderOut

        customer = self.customer_repo.get_by_id(order.customer_id)
        products = self.product_repo.get_many([item.product_id for item in order.items])
        payload = OrderOut.model_validate(order).model_dump(mode="json")
        payload["customer_name"] = customer.full_name if customer else None
        for item_payload, item in zip(payload["items"], order.items):
            product = products.get(item.product_id)
            item_payload["product_name"] = product.name if product else None
        return payload

    def decorate_many(self, orders: list[Order]) -> list[dict]:
        from app.application.schemas.order import OrderOut

        customer_ids = list({o.customer_id for o in orders})
        product_ids = list({item.product_id for o in orders for item in o.items})
        customers = {}
        for customer_id in customer_ids:
            customer = self.customer_repo.get_by_id(customer_id)
            if customer is not None:
                customers[customer.id] = customer
        products = self.product_repo.get_many(product_ids)

        payloads = []
        for order in orders:
            payload = OrderOut.model_validate(order).model_dump(mode="json")
            customer = customers.get(order.customer_id)
            payload["customer_name"] = customer.full_name if customer else None
            for item_payload, item in zip(payload["items"], order.items):
                product = products.get(item.product_id)
                item_payload["product_name"] = product.name if product else None
            payloads.append(payload)
        return payloads

    # ------------------------------------------------------------------
    # Stock and statistics helpers
    # ------------------------------------------------------------------
    def _deduct_stock(self, order: Order, items: list[OrderItem]) -> None:
        for item in items:
            self.inventory_repo.adjust_quantity(
                item.product_id,
                -item.quantity,
                reference=order.order_number,
                note=f"Order {order.order_number}",
                movement_type="shipped",
            )

    def _restock(self, order: Order, items: list[OrderItem]) -> None:
        for item in items:
            self.inventory_repo.adjust_quantity(
                item.product_id,
                item.quantity,
                reference=order.order_number,
                note=f"Restock for {order.order_number}",
                movement_type="returned",
            )

    def _sync_stock(self, order: Order, items: list[OrderItem], old_status: str) -> None:
        old_consumes = old_status in _CONSUMES_STOCK
        new_consumes = order.status in _CONSUMES_STOCK
        if old_consumes and not new_consumes:
            self._restock(order, items)
        elif not old_consumes and new_consumes:
            self._deduct_stock(order, items)

    def _refresh_customer_stats(self, customer_id: uuid.UUID) -> None:
        orders, spent = self.order_repo.customer_totals(customer_id)
        self.customer_repo.update_statistics(customer_id, orders, spent)

    @staticmethod
    def _generate_number(prefix: str) -> str:
        suffix = uuid.uuid4().hex[:10].upper()
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
        return f"{prefix}-{stamp}-{suffix}"
