from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.enums import OrderStatus, PaymentStatus
from src.models.medicine import Medicine
from src.models.order import Order
from src.models.order_item import OrderItem
from src.models.payment import Payment
from src.models.sale import Sale
from src.models.sale_item import SaleItem


class AnalyticsRepository:
    """Read-only aggregate queries for the admin dashboard. Every query here
    is careful to count each unit/amount sold exactly once: Sale rows with
    order_id set are the fulfillment record of an order already counted via
    ORDER_ITEMS/PAYMENTS, not a second sale of the same items - only POS
    sales (order_id IS NULL) are counted as their own event."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def best_sellers(self, limit: int) -> list[tuple[int, str, int]]:
        order_units = (
            select(
                OrderItem.medicine_id.label("medicine_id"),
                OrderItem.medicine_name.label("medicine_name"),
                OrderItem.quantity.label("qty"),
            )
            .join(Order, Order.order_id == OrderItem.order_id)
            .where(Order.status != OrderStatus.CANCELLED)
        )
        sale_units = (
            select(
                SaleItem.medicine_id.label("medicine_id"),
                SaleItem.medicine_name.label("medicine_name"),
                SaleItem.quantity.label("qty"),
            )
            .join(Sale, Sale.sale_id == SaleItem.sale_id)
            .where(Sale.order_id.is_(None))
        )
        combined = order_units.union_all(sale_units).subquery()
        units_sold = func.sum(combined.c.qty).label("units_sold")
        stmt = (
            select(
                combined.c.medicine_id,
                # Grouped by medicine_id only, not also medicine_name - the
                # name is frozen per order/sale row, so a medicine renamed
                # between an order and a later sale would otherwise split
                # into two rows for the same medicine_id. max() just picks
                # one of the (possibly differing) frozen names to display.
                func.max(combined.c.medicine_name).label("medicine_name"),
                units_sold,
            )
            .group_by(combined.c.medicine_id)
            .order_by(units_sold.desc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return [(row.medicine_id, row.medicine_name, row.units_sold) for row in result]

    async def low_stock(self) -> list[Medicine]:
        stmt = (
            select(Medicine)
            .where(Medicine.stock_quantity <= Medicine.reorder_threshold)
            .order_by(Medicine.stock_quantity)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def daily_revenue(self, since: datetime) -> list[tuple[date, Decimal]]:
        order_revenue = select(
            cast(Payment.paid_at, Date).label("day"), Payment.amount.label("amount")
        ).where(Payment.status == PaymentStatus.PAID, Payment.paid_at >= since)
        sale_revenue = select(
            cast(Sale.created_at, Date).label("day"),
            Sale.total_amount.label("amount"),
        ).where(Sale.order_id.is_(None), Sale.created_at >= since)
        combined = order_revenue.union_all(sale_revenue).subquery()
        stmt = (
            select(combined.c.day, func.sum(combined.c.amount).label("total_revenue"))
            .group_by(combined.c.day)
            .order_by(combined.c.day)
        )
        result = await self._session.execute(stmt)
        return [(row.day, row.total_revenue) for row in result]
