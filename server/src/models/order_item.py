from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class OrderItem(Base):
    __tablename__ = "order_items"

    order_item_id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False, index=True
    )
    medicine_id: Mapped[int] = mapped_column(
        ForeignKey("medicines.medicine_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    # Price frozen at order time - MEDICINES.price can change later without
    # altering what a past order shows the customer actually paid. Name is
    # frozen for the same reason, and so a client can render an order summary
    # without a round trip per line item to look up each medicine's name.
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    medicine_name: Mapped[str] = mapped_column(String(150), nullable=False)
