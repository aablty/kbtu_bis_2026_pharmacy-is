"""add medicine_name to order_items

Revision ID: 8d57aed8d0e6
Revises: db6fd8a5265c
Create Date: 2026-10-31 02:18:02.903513

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d57aed8d0e6'
down_revision: Union[str, Sequence[str], None] = 'db6fd8a5265c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Nullable first - existing rows (if any) need backfilling before the
    # NOT NULL constraint can be added, since this column has no default.
    op.add_column('order_items', sa.Column('medicine_name', sa.String(length=150), nullable=True))
    op.execute(
        """
        UPDATE order_items
        SET medicine_name = medicines.name
        FROM medicines
        WHERE order_items.medicine_id = medicines.medicine_id
        """
    )
    op.alter_column('order_items', 'medicine_name', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('order_items', 'medicine_name')
