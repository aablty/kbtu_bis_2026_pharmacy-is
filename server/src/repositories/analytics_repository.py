from datetime import UTC, date, datetime, timedelta
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
from src.models.stock_batch import BatchWriteOff, StockBatch


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

    async def expiring_batches(
        self, within_days: int
    ) -> list[tuple[int, int, str, date, int]]:
        cutoff = (datetime.now(UTC) + timedelta(days=within_days)).date()
        stmt = (
            select(
                StockBatch.batch_id,
                StockBatch.medicine_id,
                Medicine.name,
                StockBatch.expiry_date,
                StockBatch.quantity_remaining,
            )
            .join(Medicine, Medicine.medicine_id == StockBatch.medicine_id)
            .where(StockBatch.expiry_date <= cutoff, StockBatch.quantity_remaining > 0)
            .order_by(StockBatch.expiry_date.asc())
        )
        result = await self._session.execute(stmt)
        return [
            (
                row.batch_id,
                row.medicine_id,
                row.name,
                row.expiry_date,
                row.quantity_remaining,
            )
            for row in result
        ]

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

    async def wastage(
        self, since: datetime | None
    ) -> list[tuple[int, str, int, Decimal]]:
        """Total written-off quantity and value per medicine, valued at the
        medicine's *current* price (not price-at-write-off-time - this repo
        keeps no price history, and a course-project wastage report doesn't
        need one)."""
        stmt = (
            select(
                StockBatch.medicine_id,
                Medicine.name,
                func.sum(BatchWriteOff.quantity).label("quantity"),
                func.sum(BatchWriteOff.quantity * Medicine.price).label("value"),
            )
            .join(StockBatch, StockBatch.batch_id == BatchWriteOff.batch_id)
            .join(Medicine, Medicine.medicine_id == StockBatch.medicine_id)
            .group_by(StockBatch.medicine_id, Medicine.name)
            .order_by(func.sum(BatchWriteOff.quantity * Medicine.price).desc())
        )
        if since is not None:
            stmt = stmt.where(BatchWriteOff.written_off_at >= since)
        result = await self._session.execute(stmt)
        return [(row.medicine_id, row.name, row.quantity, row.value) for row in result]
