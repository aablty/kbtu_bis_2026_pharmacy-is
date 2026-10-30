from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base
from src.models.enums import OrderStatus
from src.models.order import order_status_enum


class OrderStatusHistory(Base):
    """Audit trail of every status an order has passed through - backs the
    order-progress-tracking UI as a timeline, not just a current-state field."""

    __tablename__ = "order_status_history"

    history_id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[OrderStatus] = mapped_column(order_status_enum, nullable=False)
    changed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL")
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
