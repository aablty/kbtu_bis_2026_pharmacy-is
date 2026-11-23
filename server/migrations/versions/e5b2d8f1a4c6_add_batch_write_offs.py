"""add batch_write_offs table

Revision ID: e5b2d8f1a4c6
Revises: d4a1c7e9f3b8
Create Date: 2026-11-23 00:00:01.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e5b2d8f1a4c6"
down_revision: Union[str, Sequence[str], None] = "d4a1c7e9f3b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "batch_write_offs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("batch_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("written_off_by", sa.Integer(), nullable=False),
        sa.Column(
            "written_off_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["batch_id"], ["stock_batches.batch_id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["written_off_by"], ["users.user_id"], ondelete="RESTRICT"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_batch_write_offs_batch_id"), "batch_write_offs", ["batch_id"]
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_batch_write_offs_batch_id"), table_name="batch_write_offs")
    op.drop_table("batch_write_offs")
