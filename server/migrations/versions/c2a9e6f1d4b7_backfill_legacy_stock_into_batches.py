"""backfill legacy stock_quantity into a legacy stock_batches row per medicine

MEDICINES.stock_quantity predates STOCK_BATCHES - it was never represented as
a batch, so FEFO deduction only ever sees batches received after this feature
shipped. The invariant going forward is `stock_quantity == sum(batch rows'
quantity_remaining)` for that medicine: every receive/deduct/restock moves
both numbers by the same delta, so the only way they can differ is this
un-backfilled legacy stock. For each medicine, `legacy = stock_quantity -
sum(quantity_remaining)`; when positive, give it one legacy batch for that
amount so the invariant holds and FEFO can draw on it too. Idempotent - a
second run sees `legacy <= 0` for every medicine and inserts nothing.

Revision ID: c2a9e6f1d4b7
Revises: b1f4a8d3c6e2
Create Date: 2026-11-16 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

revision: str = "c2a9e6f1d4b7"
down_revision: Union[str, Sequence[str], None] = "b1f4a8d3c6e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # A legacy batch has no real shipment behind it, so there's no real
    # expiry - far enough out that FEFO always drains real, dated batches
    # first. The medicine's own supplier_id is the closest thing to "where
    # this stock came from" since this predates per-batch suppliers.
    op.execute(
        """
        INSERT INTO stock_batches
            (medicine_id, supplier_id, quantity_received, quantity_remaining,
             expiry_date, barcode, version, received_at)
        SELECT
            m.medicine_id,
            m.supplier_id,
            legacy.amount,
            legacy.amount,
            DATE '2099-12-31',
            'LEGACY-' || m.medicine_id,
            1,
            now()
        FROM medicines m
        JOIN (
            SELECT
                m.medicine_id,
                m.stock_quantity - COALESCE(SUM(b.quantity_remaining), 0) AS amount
            FROM medicines m
            LEFT JOIN stock_batches b ON b.medicine_id = m.medicine_id
            GROUP BY m.medicine_id, m.stock_quantity
        ) legacy ON legacy.medicine_id = m.medicine_id
        WHERE legacy.amount > 0
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM stock_batches WHERE barcode LIKE 'LEGACY-%'")
