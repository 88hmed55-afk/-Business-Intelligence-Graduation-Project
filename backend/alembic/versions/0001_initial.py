"""initial schema: users, dashboards, reports, kpis and analytical views

Revision ID: 0001
Revises:
Create Date: 2026-08-04

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _kpi_performance_view() -> str:
    return """
    CREATE VIEW kpi_performance_v AS
    SELECT
        k.id AS kpi_id,
        k.name AS kpi_name,
        k.category,
        k.target_value,
        k.current_value,
        k.unit,
        k.trend,
        CASE
            WHEN k.target_value > 0 THEN ROUND((k.current_value / k.target_value) * 100, 2)
            ELSE NULL
        END AS achievement_pct,
        date_trunc('month', k.updated_at)::date AS period,
        k.updated_at
    FROM kpis k;
    """


def _dashboard_summary_view() -> str:
    return """
    CREATE VIEW dashboard_summary_v AS
    SELECT
        d.id AS dashboard_id,
        d.name AS dashboard_name,
        d.is_public,
        d.is_favorite,
        u.email AS owner_email,
        COUNT(k.id) AS kpi_count
    FROM dashboards d
    JOIN users u ON u.id = d.created_by
    LEFT JOIN kpis k ON k.dashboard_id = d.id
    GROUP BY d.id, d.name, d.is_public, d.is_favorite, u.email;
    """


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=50), nullable=False, server_default="analyst"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_superuser", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("role IN ('admin', 'analyst', 'viewer')", name="ck_users_role"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_id", "users", ["id"])

    op.create_table(
        "dashboards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=220), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("is_favorite", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_dashboards_slug", "dashboards", ["slug"], unique=True)
    op.create_index("ix_dashboards_created_by", "dashboards", ["created_by"])
    op.create_index("ix_dashboards_id", "dashboards", ["id"])

    op.create_table(
        "reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("query", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="draft"),
        sa.Column("schedule", sa.String(length=255), nullable=True),
        sa.Column(
            "config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "status IN ('draft', 'published', 'archived')", name="ck_reports_status"
        ),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reports_created_by", "reports", ["created_by"])
    op.create_index("ix_reports_id", "reports", ["id"])
    op.create_index("ix_reports_status_created", "reports", ["status", "created_at"])

    op.create_table(
        "kpis",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=False, server_default="finance"),
        sa.Column("formula", sa.Text(), nullable=False, server_default=""),
        sa.Column("target_value", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("current_value", sa.Numeric(precision=14, scale=2), nullable=True),
        sa.Column("unit", sa.String(length=50), nullable=True),
        sa.Column("trend", sa.String(length=20), nullable=False, server_default="flat"),
        sa.Column("dashboard_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "category IN ('finance', 'sales', 'operations', 'marketing', 'hr', 'it', 'other')",
            name="ck_kpis_category",
        ),
        sa.CheckConstraint("trend IN ('up', 'down', 'flat')", name="ck_kpis_trend"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["dashboard_id"], ["dashboards.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_kpis_category", "kpis", ["category"])
    op.create_index("ix_kpis_created_by", "kpis", ["created_by"])
    op.create_index("ix_kpis_dashboard_id", "kpis", ["dashboard_id"])
    op.create_index("ix_kpis_id", "kpis", ["id"])

    op.execute(_kpi_performance_view())
    op.execute(_dashboard_summary_view())


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS dashboard_summary_v")
    op.execute("DROP VIEW IF EXISTS kpi_performance_v")

    op.drop_index("ix_kpis_id", table_name="kpis")
    op.drop_index("ix_kpis_dashboard_id", table_name="kpis")
    op.drop_index("ix_kpis_created_by", table_name="kpis")
    op.drop_index("ix_kpis_category", table_name="kpis")
    op.drop_table("kpis")

    op.drop_index("ix_reports_status_created", table_name="reports")
    op.drop_index("ix_reports_id", table_name="reports")
    op.drop_index("ix_reports_created_by", table_name="reports")
    op.drop_table("reports")

    op.drop_index("ix_dashboards_id", table_name="dashboards")
    op.drop_index("ix_dashboards_created_by", table_name="dashboards")
    op.drop_index("ix_dashboards_slug", table_name="dashboards")
    op.drop_table("dashboards")

    op.drop_index("ix_users_id", table_name="users")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
