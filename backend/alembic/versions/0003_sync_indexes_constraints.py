"""sync indexes and unique constraints with models

Revision ID: 22a630f04987
Revises: 0002
Create Date: 2026-08-04 17:27:32.253941

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '22a630f04987'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(op.f('ix_activity_logs_user_id'), 'activity_logs', ['user_id'], unique=False)
    op.drop_index('ix_inventory_product_id', table_name='inventory')
    op.create_unique_constraint('uq_inventory_product_id', 'inventory', ['product_id'])
    op.create_index(op.f('ix_payments_payment_number'), 'payments', ['payment_number'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_payments_payment_number'), table_name='payments')
    op.drop_constraint('uq_inventory_product_id', 'inventory', type_='unique')
    op.create_index('ix_inventory_product_id', 'inventory', ['product_id'], unique=True)
    op.drop_index(op.f('ix_activity_logs_user_id'), table_name='activity_logs')
