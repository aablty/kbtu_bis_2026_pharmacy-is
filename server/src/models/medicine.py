from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base
from src.models.enums import DosageForm


class Medicine(Base):
    __tablename__ = "medicines"
    __table_args__ = (Index("ix_medicines_name", "name"),)

    medicine_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    manufacturer: Mapped[str | None] = mapped_column(String(150))
    dosage_form: Mapped[DosageForm | None] = mapped_column(
        Enum(
            DosageForm,
            name="dosage_form",
            values_callable=lambda enum: [member.value for member in enum],
        )
    )
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    requires_prescription: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    stock_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reorder_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Bumped by every stock-mutating write (order placement/cancellation, POS
    # sale) so the sales flow's optimistic-locking check can detect *any*
    # concurrent change to this row, not just ones it made itself.
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.category_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    supplier_id: Mapped[int] = mapped_column(
        ForeignKey("suppliers.supplier_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # Ordered gallery of remote image URLs; first entry is the primary photo.
    image_urls: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list, server_default="[]"
    )
    # Reserved for the future scraper/import pipeline (feat/data-import) to upsert
    # against instead of duplicating rows - unused by anything built so far.
    external_source_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
