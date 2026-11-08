"""merge the dosage-form and locale migration branches

Revision ID: c8e1f4a6b2d9
Revises: d4a9e2f1c8b0, f2a7c9d4e1b3
"""

revision: str = "c8e1f4a6b2d9"
down_revision: tuple[str, str] = ("d4a9e2f1c8b0", "f2a7c9d4e1b3")
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None


def upgrade() -> None:
    """Merge both migration branches without additional schema changes."""


def downgrade() -> None:
    """Split the graph back into its two original heads."""
