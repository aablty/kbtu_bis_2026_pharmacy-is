"""add stock_batches and order_item_batches tables, batch_expiring notification type

Revision ID: b1f4a8d3c6e2
Revises: a7d3f9c2e5b1
Create Date: 2026-11-16 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b1f4a8d3c6e2"
down_revision: Union[str, Sequence[str], None] = "a7d3f9c2e5b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Postgres can't use a freshly-added enum value inside the same
    # transaction that added it, so this runs in its own autocommit block,
    # before the table creation below (which doesn't touch the enum anyway).
    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'batch_expiring'"
        )

    op.create_table(
        "stock_batches",
        sa.Column("batch_id", sa.Integer(), nullable=False),
        sa.Column("medicine_id", sa.Integer(), nullable=False),
        sa.Column("supplier_id", sa.Integer(), nullable=False),
        sa.Column("quantity_received", sa.Integer(), nullable=False),
        sa.Column("quantity_remaining", sa.Integer(), nullable=False),
        sa.Column("expiry_date", sa.Date(), nullable=False),
        sa.Column("barcode", sa.String(length=32), nullable=True),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["medicine_id"], ["medicines.medicine_id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["supplier_id"], ["suppliers.supplier_id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("batch_id"),
        sa.UniqueConstraint("barcode"),
    )
    op.create_index(
        op.f("ix_stock_batches_medicine_id"), "stock_batches", ["medicine_id"]
    )

    op.create_table(
        "order_item_batches",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_item_id", sa.Integer(), nullable=False),
        sa.Column("batch_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["order_item_id"], ["order_items.order_item_id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["batch_id"], ["stock_batches.batch_id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_order_item_batches_order_item_id"),
        "order_item_batches",
        ["order_item_id"],
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_order_item_batches_order_item_id"), table_name="order_item_batches"
    )
    op.drop_table("order_item_batches")
    op.drop_index(op.f("ix_stock_batches_medicine_id"), table_name="stock_batches")
    op.drop_table("stock_batches")
    # Postgres has no DROP VALUE for enums - the batch_expiring member is left
    # in place on downgrade, matching how this repo already treats other
    # ALTER TYPE ... ADD VALUE migrations.
