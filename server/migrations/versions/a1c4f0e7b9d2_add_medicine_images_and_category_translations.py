"""add medicine image_urls and category translations

Revision ID: a1c4f0e7b9d2
Revises: d6ab26ce14ef
Create Date: 2026-11-06 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1c4f0e7b9d2"
down_revision: Union[str, Sequence[str], None] = "d6ab26ce14ef"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "medicines",
        sa.Column("image_urls", sa.JSON(), server_default="[]", nullable=False),
    )
    op.add_column("categories", sa.Column("name_ru", sa.String(length=100)))


def downgrade() -> None:
    op.drop_column("categories", "name_ru")
    op.drop_column("medicines", "image_urls")
