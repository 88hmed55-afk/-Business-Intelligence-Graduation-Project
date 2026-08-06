"""commerce module: roles, customers, products, orders, inventory, payments, employees, settings

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-04

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_users_role", "users", type_="check")
    op.create_check_constraint(
        "ck_users_role",
        "users",
        "role IN ('admin', 'analyst', 'viewer', 'sales_manager', 'inventory_manager')",
    )

    # ------------------------------------------------------------------
    # Roles & permissions
    # ------------------------------------------------------------------
    op.create_table(
        "roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "name IN ('admin', 'analyst', 'viewer', 'sales_manager', 'inventory_manager')",
            name="ck_roles_name",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_roles_id", "roles", ["id"])
    op.create_index("ix_roles_name", "roles", ["name"], unique=True)

    op.create_table(
        "permissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("module", sa.String(length=50), nullable=False),
        sa.Column("action", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "action IN ('read', 'create', 'update', 'delete', 'export', 'publish')",
            name="ck_permissions_action",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_permissions_id", "permissions", ["id"])
    op.create_index("ix_permissions_code", "permissions", ["code"], unique=True)
    op.create_index("ix_permissions_module", "permissions", ["module"])

    op.create_table(
        "role_permissions",
        sa.Column("role_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("permission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("role_id", "permission_id"),
    )

    # ------------------------------------------------------------------
    # Customers
    # ------------------------------------------------------------------
    op.create_table(
        "customers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("company", sa.String(length=255), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("total_orders", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_spent", sa.Numeric(precision=16, scale=2), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('active', 'inactive', 'vip', 'prospect')", name="ck_customers_status"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_customers_id", "customers", ["id"])
    op.create_index("ix_customers_email", "customers", ["email"], unique=True)
    op.create_index("ix_customers_status", "customers", ["status"])
    op.create_index("ix_customers_city", "customers", ["city"])

    # ------------------------------------------------------------------
    # Categories
    # ------------------------------------------------------------------
    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("slug", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["parent_id"], ["categories.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_categories_id", "categories", ["id"])
    op.create_index("ix_categories_name", "categories", ["name"], unique=True)
    op.create_index("ix_categories_slug", "categories", ["slug"], unique=True)

    # ------------------------------------------------------------------
    # Suppliers
    # ------------------------------------------------------------------
    op.create_table(
        "suppliers",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("contact_name", sa.String(length=150), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=True),
        sa.Column("tax_id", sa.String(length=100), nullable=True),
        sa.Column("website", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_suppliers_id", "suppliers", ["id"])
    op.create_index("ix_suppliers_name", "suppliers", ["name"], unique=True)
    op.create_index("ix_suppliers_country", "suppliers", ["country"])

    # ------------------------------------------------------------------
    # Products
    # ------------------------------------------------------------------
    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("sku", sa.String(length=100), nullable=False),
        sa.Column("barcode", sa.String(length=100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("unit_price", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("cost_price", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("reorder_level", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("weight_kg", sa.Numeric(precision=10, scale=3), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["supplier_id"], ["suppliers.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_products_id", "products", ["id"])
    op.create_index("ix_products_sku", "products", ["sku"], unique=True)
    op.create_index("ix_products_name", "products", ["name"])
    op.create_index("ix_products_category_id", "products", ["category_id"])
    op.create_index("ix_products_supplier_id", "products", ["supplier_id"])

    # ------------------------------------------------------------------
    # Inventory
    # ------------------------------------------------------------------
    op.create_table(
        "inventory",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=16, scale=2), nullable=False, server_default="0"),
        sa.Column("reserved_quantity", sa.Numeric(precision=16, scale=2), nullable=False, server_default="0"),
        sa.Column("warehouse", sa.String(length=100), nullable=False, server_default="main"),
        sa.Column("location", sa.String(length=150), nullable=True),
        sa.Column("last_restocked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inventory_id", "inventory", ["id"])
    op.create_index("ix_inventory_product_id", "inventory", ["product_id"], unique=True)
    op.create_index("ix_inventory_warehouse", "inventory", ["warehouse"])
    op.create_index("ix_inventory_quantity", "inventory", ["quantity"])

    op.create_table(
        "inventory_movements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("inventory_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("movement_type", sa.String(length=20), nullable=False),
        sa.Column("quantity_change", sa.Numeric(precision=16, scale=2), nullable=False),
        sa.Column("reference", sa.String(length=150), nullable=True),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column("moved_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "movement_type IN ('received', 'shipped', 'adjusted', 'returned', 'reserved', 'released')",
            name="ck_inventory_movements_type",
        ),
        sa.ForeignKeyConstraint(["inventory_id"], ["inventory.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inventory_movements_id", "inventory_movements", ["id"])
    op.create_index("ix_inventory_movements_product", "inventory_movements", ["product_id", "created_at"])

    # ------------------------------------------------------------------
    # Orders
    # ------------------------------------------------------------------
    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_number", sa.String(length=50), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("subtotal", sa.Numeric(precision=16, scale=2), nullable=False, server_default="0"),
        sa.Column("discount_amount", sa.Numeric(precision=16, scale=2), nullable=False, server_default="0"),
        sa.Column("tax_amount", sa.Numeric(precision=16, scale=2), nullable=False, server_default="0"),
        sa.Column("shipping_fee", sa.Numeric(precision=16, scale=2), nullable=False, server_default="0"),
        sa.Column("total_amount", sa.Numeric(precision=16, scale=2), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="USD"),
        sa.Column("payment_status", sa.String(length=20), nullable=False, server_default="unpaid"),
        sa.Column("order_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')",
            name="ck_orders_status",
        ),
        sa.CheckConstraint(
            "payment_status IN ('unpaid', 'partial', 'paid', 'refunded')",
            name="ck_orders_payment_status",
        ),
        sa.CheckConstraint("total_amount >= 0", name="ck_orders_total_amount"),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_orders_id", "orders", ["id"])
    op.create_index("ix_orders_order_number", "orders", ["order_number"], unique=True)
    op.create_index("ix_orders_status", "orders", ["status"])
    op.create_index("ix_orders_order_date", "orders", ["order_date"])
    op.create_index("ix_orders_customer_id", "orders", ["customer_id"])
    op.create_index("ix_orders_status_order_date", "orders", ["status", "order_date"])

    op.create_table(
        "order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("discount_amount", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("line_total", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_order_items_quantity"),
        sa.CheckConstraint("line_total >= 0", name="ck_order_items_line_total"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_order_items_id", "order_items", ["id"])
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])
    op.create_index("ix_order_items_product_id", "order_items", ["product_id"])

    # ------------------------------------------------------------------
    # Payments
    # ------------------------------------------------------------------
    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("payment_number", sa.String(length=50), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(precision=16, scale=2), nullable=False),
        sa.Column("method", sa.String(length=30), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("transaction_id", sa.String(length=200), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('pending', 'completed', 'failed', 'refunded')", name="ck_payments_status"
        ),
        sa.CheckConstraint(
            "method IN ('credit_card', 'debit_card', 'bank_transfer', 'cash', 'wallet', 'paypal')",
            name="ck_payments_method",
        ),
        sa.CheckConstraint("amount >= 0", name="ck_payments_amount"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payments_id", "payments", ["id"])
    op.create_index("ix_payments_order_id", "payments", ["order_id"])
    op.create_index("ix_payments_status", "payments", ["status"])
    op.create_index("ix_payments_paid_at", "payments", ["paid_at"])

    # ------------------------------------------------------------------
    # Employees
    # ------------------------------------------------------------------
    op.create_table(
        "employees",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("department", sa.String(length=100), nullable=False),
        sa.Column("position", sa.String(length=150), nullable=False),
        sa.Column("salary", sa.Numeric(precision=14, scale=2), nullable=False, server_default="0"),
        sa.Column("hire_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("manager_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("address", sa.String(length=500), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('active', 'on_leave', 'terminated')", name="ck_employees_status"
        ),
        sa.CheckConstraint("salary >= 0", name="ck_employees_salary"),
        sa.ForeignKeyConstraint(["manager_id"], ["employees.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_employees_id", "employees", ["id"])
    op.create_index("ix_employees_email", "employees", ["email"], unique=True)
    op.create_index("ix_employees_department", "employees", ["department"])

    # ------------------------------------------------------------------
    # Settings
    # ------------------------------------------------------------------
    op.create_table(
        "settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("key", sa.String(length=150), nullable=False),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("group_name", sa.String(length=100), nullable=False, server_default="general"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_settings_id", "settings", ["id"])
    op.create_index("ix_settings_key", "settings", ["key"], unique=True)
    op.create_index("ix_settings_group", "settings", ["group_name"])

    # ------------------------------------------------------------------
    # Notifications
    # ------------------------------------------------------------------
    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("notification_type", sa.String(length=20), nullable=False, server_default="info"),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "notification_type IN ('info', 'success', 'warning', 'error')", name="ck_notifications_type"
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_id", "notifications", ["id"])
    op.create_index("ix_notifications_user_read", "notifications", ["user_id", "is_read"])

    # ------------------------------------------------------------------
    # Activity logs
    # ------------------------------------------------------------------
    op.create_table(
        "activity_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(length=30), nullable=False),
        sa.Column("module", sa.String(length=50), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=True),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("summary", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_activity_logs_id", "activity_logs", ["id"])
    op.create_index("ix_activity_logs_user", "activity_logs", ["user_id"])
    op.create_index("ix_activity_logs_module", "activity_logs", ["module"])
    op.create_index("ix_activity_logs_entity", "activity_logs", ["entity_type", "entity_id"])
    op.create_index("ix_activity_logs_created", "activity_logs", ["created_at"])

    # ------------------------------------------------------------------
    # Statistics snapshots
    # ------------------------------------------------------------------
    op.create_table(
        "statistic_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("period", sa.Date(), nullable=False),
        sa.Column("metric_key", sa.String(length=150), nullable=False),
        sa.Column("value", sa.Numeric(precision=20, scale=4), nullable=False, server_default="0"),
        sa.Column("extra", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("period", "metric_key", name="uq_statistic_snapshots_period_key"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_statistic_snapshots_id", "statistic_snapshots", ["id"])
    op.create_index("ix_statistic_snapshots_period", "statistic_snapshots", ["period"])


def downgrade() -> None:
    for table in (
        "statistic_snapshots",
        "activity_logs",
        "notifications",
        "settings",
        "employees",
        "payments",
        "order_items",
        "orders",
        "inventory_movements",
        "inventory",
        "products",
        "suppliers",
        "categories",
        "customers",
        "role_permissions",
        "permissions",
        "roles",
    ):
        op.drop_table(table)

    op.drop_constraint("ck_users_role", "users", type_="check")
    op.create_check_constraint(
        "ck_users_role",
        "users",
        "role IN ('admin', 'analyst', 'viewer')",
    )
