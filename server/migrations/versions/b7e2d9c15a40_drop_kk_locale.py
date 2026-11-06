"""drop kk from locale enum

Revision ID: b7e2d9c15a40
Revises: a1c4f0e7b9d2
Create Date: 2026-11-06 13:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

revision: str = "b7e2d9c15a40"
down_revision: Union[str, Sequence[str], None] = "a1c4f0e7b9d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Postgres can't drop an enum value in place: recreate the type.
    op.execute("ALTER TABLE users ALTER COLUMN preferred_locale TYPE text")
    op.execute("UPDATE users SET preferred_locale = 'en' WHERE preferred_locale = 'kk'")
    op.execute("DROP TYPE locale")
    op.execute("CREATE TYPE locale AS ENUM ('en', 'ru')")
    op.execute(
        "ALTER TABLE users ALTER COLUMN preferred_locale TYPE locale "
        "USING preferred_locale::locale"
    )


def downgrade() -> None:
    op.execute("ALTER TYPE locale ADD VALUE IF NOT EXISTS 'kk'")
