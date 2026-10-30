from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base
from src.models.enums import FulfillmentType, OrderStatus

# Shared instance - OrderStatus backs columns on both `orders` and
# `order_status_history`. Two separate Enum(...) objects with the same `name`
# would make SQLAlchemy try to CREATE TYPE order_status twice; reusing one
# instance is how it knows they're the same Postgres type.
order_status_enum = Enum(
    OrderStatus, name="order_status", values_callable=lambda e: [m.value for m in e]
)


class Order(Base):
    __tablename__ = "orders"

    order_id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False, index=True
    )
    status: Mapped[OrderStatus] = mapped_column(
        order_status_enum, nullable=False, default=OrderStatus.PENDING
    )
    fulfillment_type: Mapped[FulfillmentType] = mapped_column(
        Enum(
            FulfillmentType,
            name="fulfillment_type",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    delivery_address: Mapped[str | None] = mapped_column(String(255))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    # Set from the client's Idempotency-Key header, when given - lets a retried
    # checkout request return the original order instead of creating a duplicate.
    idempotency_key: Mapped[str | None] = mapped_column(String(100), unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
