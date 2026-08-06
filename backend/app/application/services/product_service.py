from __future__ import annotations
import uuid
from decimal import Decimal
from typing import Optional, Tuple

from app.application.schemas.product import ProductCreate, ProductUpdate
from app.core.exceptions import ConflictError, NotFoundError
from app.domain.entities.inventory import Inventory
from app.domain.entities.product import Product
from app.domain.repositories.inventory_repository import InventoryRepository
from app.domain.repositories.product_repository import ProductRepository
from app.shared.utils.helpers import sanitize_text, utc_now


class ProductService:
    def __init__(
        self, product_repo: ProductRepository, inventory_repo: InventoryRepository
    ) -> None:
        self.product_repo = product_repo
        self.inventory_repo = inventory_repo

    def list(
        self,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        category_id: Optional[uuid.UUID] = None,
        supplier_id: Optional[uuid.UUID] = None,
        is_active: Optional[bool] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
    ) -> Tuple[list[Product], int]:
        return self.product_repo.list(
            page=page,
            page_size=page_size,
            search=search,
            category_id=category_id,
            supplier_id=supplier_id,
            is_active=is_active,
            min_price=min_price,
            max_price=max_price,
        )

    def get(self, product_id: uuid.UUID) -> Product:
        product = self.product_repo.get_by_id(product_id)
        if product is None:
            raise NotFoundError("Product not found.")
        return product

    def create(self, data: ProductCreate) -> Product:
        if self.product_repo.get_by_sku(data.sku):
            raise ConflictError("A product with this SKU already exists.")
        now = utc_now()
        entity = Product(
            id=uuid.uuid4(),
            name=sanitize_text(data.name),
            sku=sanitize_text(data.sku),
            barcode=sanitize_text(data.barcode) if data.barcode else None,
            description=sanitize_text(data.description) if data.description else None,
            category_id=data.category_id,
            supplier_id=data.supplier_id,
            unit_price=data.unit_price,
            cost_price=data.cost_price,
            reorder_level=data.reorder_level,
            weight_kg=data.weight_kg,
            is_active=data.is_active,
            created_at=now,
            updated_at=now,
        )
        created = self.product_repo.create(entity)
        self.inventory_repo.create(
            Inventory(
                id=uuid.uuid4(),
                product_id=created.id,
                quantity=Decimal("0"),
                reserved_quantity=Decimal("0"),
                warehouse="main",
                location=None,
            )
        )
        return created

    def update(self, product_id: uuid.UUID, data: ProductUpdate) -> Product:
        product = self.get(product_id)
        provided = data.model_fields_set

        if "sku" in provided and data.sku is not None:
            candidate = sanitize_text(data.sku)
            existing = self.product_repo.get_by_sku(candidate)
            if existing is not None and existing.id != product.id:
                raise ConflictError("A product with this SKU already exists.")
            product.sku = candidate

        text_fields = {
            "name": data.name,
            "barcode": data.barcode,
            "description": data.description,
        }
        for field_name, value in text_fields.items():
            if field_name in provided:
                setattr(product, field_name, sanitize_text(value) if value else None)

        numeric_fields = {
            "unit_price": data.unit_price,
            "cost_price": data.cost_price,
            "reorder_level": data.reorder_level,
            "weight_kg": data.weight_kg,
        }
        for field_name, value in numeric_fields.items():
            if field_name in provided:
                setattr(product, field_name, value)

        for field_name in ("category_id", "supplier_id", "is_active"):
            if field_name in provided:
                setattr(product, field_name, getattr(data, field_name))

        product.updated_at = utc_now()
        return self.product_repo.update(product)

    def delete(self, product_id: uuid.UUID) -> None:
        product = self.get(product_id)
        product.is_deleted = True
        product.deleted_at = utc_now()
        product.updated_at = utc_now()
        self.product_repo.soft_delete(product)

    def top_sellers(self, limit: int = 10) -> list:
        return self.product_repo.top_sellers(limit=limit)
