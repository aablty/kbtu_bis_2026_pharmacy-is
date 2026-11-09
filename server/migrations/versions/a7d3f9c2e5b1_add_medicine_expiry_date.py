"""add medicines.expiry_date

Revision ID: a7d3f9c2e5b1
Revises: c8e1f4a6b2d9
Create Date: 2026-11-09 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a7d3f9c2e5b1"
down_revision: Union[str, Sequence[str], None] = "c8e1f4a6b2d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("medicines", sa.Column("expiry_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("medicines", "expiry_date")
