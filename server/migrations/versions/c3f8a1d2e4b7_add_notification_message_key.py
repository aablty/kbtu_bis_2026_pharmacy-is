"""add message_key and message_params to notifications

Revision ID: c3f8a1d2e4b7
Revises: b7e2d9c15a40
Create Date: 2026-11-07 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3f8a1d2e4b7"
down_revision: Union[str, Sequence[str], None] = "b7e2d9c15a40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "notifications", sa.Column("message_key", sa.String(length=40), nullable=True)
    )
    op.add_column(
        "notifications", sa.Column("message_params", sa.JSON(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("notifications", "message_params")
    op.drop_column("notifications", "message_key")
