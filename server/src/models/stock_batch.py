from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class StockBatch(Base):
    __tablename__ = "stock_batches"

    batch_id: Mapped[int] = mapped_column(primary_key=True)
    medicine_id: Mapped[int] = mapped_column(
        ForeignKey("medicines.medicine_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    supplier_id: Mapped[int] = mapped_column(
        ForeignKey("suppliers.supplier_id", ondelete="RESTRICT"), nullable=False
    )
    quantity_received: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity_remaining: Mapped[int] = mapped_column(Integer, nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    # Nullable at the DB level only because it's generated right after insert,
    # once batch_id is known - BatchRepository.create always fills it before
    # the row is used by anything else.
    barcode: Mapped[str | None] = mapped_column(String(32), unique=True)
    # Optimistic-lock column for the sales-side FEFO path - same role as
    # Medicine.version.
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class OrderItemBatch(Base):
    """Allocation ledger: which batch(es) an order line actually drew from,
    so cancellation can restock the right batch instead of guessing. POS
    sales don't need this - sales are never cancelled/restocked."""

    __tablename__ = "order_item_batches"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_item_id: Mapped[int] = mapped_column(
        ForeignKey("order_items.order_item_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    batch_id: Mapped[int] = mapped_column(
        ForeignKey("stock_batches.batch_id", ondelete="RESTRICT"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
