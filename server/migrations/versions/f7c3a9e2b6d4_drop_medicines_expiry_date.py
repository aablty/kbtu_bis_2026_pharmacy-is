"""drop medicines.expiry_date - expiry is batch-level now

MEDICINES.expiry_date predates STOCK_BATCHES and has been unused by the API
since the previous two migrations (c2a9e6f1d4b7 backfilled its value into a
legacy batch per medicine, and the routers/schemas stopped reading or writing
it). Expiry is entirely STOCK_BATCHES.expiry_date now - the public
MedicineResponse.expiry_date field is computed from the medicine's in-stock
batches, never from this column.

Uses IF EXISTS/IF NOT EXISTS rather than plain op.drop_column/add_column:
some environments' schema already had this column dropped by hand before
this migration existed (a Neon branch cut from one where it was already
gone), and alembic has no record of that - a plain DROP COLUMN there would
abort the whole migration run with "column does not exist".

Revision ID: f7c3a9e2b6d4
Revises: e5b2d8f1a4c6
Create Date: 2026-11-23 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

revision: str = "f7c3a9e2b6d4"
down_revision: Union[str, Sequence[str], None] = "e5b2d8f1a4c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE medicines DROP COLUMN IF EXISTS expiry_date")


def downgrade() -> None:
    op.execute("ALTER TABLE medicines ADD COLUMN IF NOT EXISTS expiry_date DATE")
