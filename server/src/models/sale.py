from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class Sale(Base):
    """One row per completed transaction - a direct POS ring-up, or the
    fulfillment record of an online order (order_id set, NULL for POS)."""

    __tablename__ = "sales"

    sale_id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int | None] = mapped_column(
        ForeignKey("orders.order_id", ondelete="RESTRICT"), unique=True
    )
    # Walk-in customers are the common case at a pharmacy register - NULL
    # means no account was identified, not a sentinel/placeholder row.
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.user_id", ondelete="RESTRICT"), index=True
    )
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False, index=True
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
