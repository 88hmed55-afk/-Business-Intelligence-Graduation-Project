from __future__ import annotations
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Generic, List, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class SalesReportRow(BaseModel):
    period: str
    order_count: int
    units_sold: Decimal
    gross_revenue: Decimal
    discount_total: Decimal
    net_revenue: Decimal
    avg_order_value: Decimal


class ProfitReportRow(BaseModel):
    period: str
    revenue: Decimal
    cogs: Decimal
    gross_profit: Decimal
    margin_pct: Decimal
    tax_total: Decimal
    net_profit: Decimal


class CustomerReportRow(BaseModel):
    customer_id: uuid.UUID
    customer_name: str
    total_orders: int
    total_spent: Decimal
    avg_order_value: Decimal
    last_order_date: datetime | None = None


class ProductReportRow(BaseModel):
    product_id: uuid.UUID
    product_name: str
    sku: str
    category: str | None = None
    units_sold: Decimal
    revenue: Decimal
    cogs: Decimal
    profit: Decimal


class InventoryReportRow(BaseModel):
    product_id: uuid.UUID
    product_name: str
    sku: str
    warehouse: str
    quantity: Decimal
    reserved_quantity: Decimal
    available_quantity: Decimal
    reorder_level: Decimal
    stock_value: Decimal
    status: str


class MonthlyReportRow(BaseModel):
    month: str
    order_count: int
    units_sold: Decimal
    revenue: Decimal
    cogs: Decimal
    profit: Decimal
    margin_pct: Decimal
    new_customers: int


class YearlyReportRow(BaseModel):
    year: int
    order_count: int
    revenue: Decimal
    cogs: Decimal
    profit: Decimal
    margin_pct: Decimal
    active_customers: int


class ReportResponse(BaseModel, Generic[T]):
    rows: List[T]
    summary: Dict[str, Any] = Field(default_factory=dict)
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    filters: Dict[str, Any] = Field(default_factory=dict)
