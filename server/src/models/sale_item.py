from decimal import Decimal

from sqlalchemy import ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base


class SaleItem(Base):
    __tablename__ = "sale_items"

    sale_item_id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int] = mapped_column(
        ForeignKey("sales.sale_id", ondelete="CASCADE"), nullable=False, index=True
    )
    medicine_id: Mapped[int] = mapped_column(
        ForeignKey("medicines.medicine_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    # Price and name frozen at sale time - same reasoning as OrderItem.
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    medicine_name: Mapped[str] = mapped_column(String(150), nullable=False)
