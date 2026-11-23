"""add stock_batches.received_by

Revision ID: d4a1c7e9f3b8
Revises: c2a9e6f1d4b7
Create Date: 2026-11-23 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4a1c7e9f3b8"
down_revision: Union[str, Sequence[str], None] = "c2a9e6f1d4b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "stock_batches", sa.Column("received_by", sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        op.f("fk_stock_batches_received_by_users"),
        "stock_batches",
        "users",
        ["received_by"],
        ["user_id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_stock_batches_received_by"), "stock_batches", ["received_by"]
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_stock_batches_received_by"), table_name="stock_batches")
    op.drop_constraint(
        op.f("fk_stock_batches_received_by_users"),
        "stock_batches",
        type_="foreignkey",
    )
    op.drop_column("stock_batches", "received_by")
