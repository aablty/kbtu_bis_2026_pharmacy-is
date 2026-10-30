from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class Category(Base):
    """Self-referencing tree, not flat - the future medicine-data scrape target
    organizes its catalog hierarchically. `slug` is the stable natural key an
    importer upserts against; `category_id` stays the surrogate PK."""

    __tablename__ = "categories"

    category_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(150), unique=True, index=True, nullable=False
    )
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.category_id", ondelete="RESTRICT")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
