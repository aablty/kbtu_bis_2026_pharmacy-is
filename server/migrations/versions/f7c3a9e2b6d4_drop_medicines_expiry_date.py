"""drop medicines.expiry_date - expiry is batch-level now

MEDICINES.expiry_date predates STOCK_BATCHES and has been unused by the API
since the previous two migrations (c2a9e6f1d4b7 backfilled its value into a
legacy batch per medicine, and the routers/schemas stopped reading or writing
it). Expiry is entirely STOCK_BATCHES.expiry_date now - the public
MedicineResponse.expiry_date field is computed from the medicine's in-stock
batches, never from this column.

Revision ID: f7c3a9e2b6d4
Revises: e5b2d8f1a4c6
Create Date: 2026-11-23 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f7c3a9e2b6d4"
down_revision: Union[str, Sequence[str], None] = "e5b2d8f1a4c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("medicines", "expiry_date")


def downgrade() -> None:
    op.add_column("medicines", sa.Column("expiry_date", sa.Date(), nullable=True))
