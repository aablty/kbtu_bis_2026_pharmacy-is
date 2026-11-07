"""drop users.preferred_locale (the UI language comes from the client's i18n)

Revision ID: d4a9e2f1c8b0
Revises: c3f8a1d2e4b7
Create Date: 2026-11-08 10:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d4a9e2f1c8b0"
down_revision: Union[str, Sequence[str], None] = "c3f8a1d2e4b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("users", "preferred_locale")
    op.execute("DROP TYPE IF EXISTS locale")


def downgrade() -> None:
    op.execute("CREATE TYPE locale AS ENUM ('en', 'ru')")
    op.add_column(
        "users",
        sa.Column(
            "preferred_locale",
            sa.Enum("en", "ru", name="locale", create_type=False),
            server_default="en",
            nullable=False,
        ),
    )
