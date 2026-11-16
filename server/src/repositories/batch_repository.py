from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.stock_batch import OrderItemBatch, StockBatch


class BatchRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self, medicine_id: int, supplier_id: int, quantity: int, expiry_date: date
    ) -> StockBatch:
        batch = StockBatch(
            medicine_id=medicine_id,
            supplier_id=supplier_id,
            quantity_received=quantity,
            quantity_remaining=quantity,
            expiry_date=expiry_date,
            barcode=None,
        )
        self._session.add(batch)
        await self._session.flush()  # need batch.batch_id to generate the barcode
        batch.barcode = (
            f"{medicine_id:05d}-{batch.batch_id:06d}-"
            f"{(medicine_id + batch.batch_id) % 97:02d}"
        )
        await self._session.flush()
        return batch

    async def get_by_id(self, batch_id: int) -> StockBatch | None:
        return await self._session.get(StockBatch, batch_id)

    async def get_by_barcode(self, barcode: str) -> StockBatch | None:
        result = await self._session.execute(
            select(StockBatch).where(StockBatch.barcode == barcode)
        )
        return result.scalar_one_or_none()

    async def list_fefo_candidates(self, medicine_id: int) -> list[StockBatch]:
        result = await self._session.execute(
            select(StockBatch)
            .where(
                StockBatch.medicine_id == medicine_id, StockBatch.quantity_remaining > 0
            )
            .order_by(StockBatch.expiry_date.asc(), StockBatch.batch_id.asc())
        )
        return list(result.scalars().all())

    async def decrement_atomic(self, batch_id: int, quantity: int) -> bool:
        stmt = (
            update(StockBatch)
            .where(
                StockBatch.batch_id == batch_id,
                StockBatch.quantity_remaining >= quantity,
            )
            .values(quantity_remaining=StockBatch.quantity_remaining - quantity)
        )
        result = await self._session.execute(stmt)
        return result.rowcount == 1  # ty: ignore[unresolved-attribute]

    async def decrement_optimistic(
        self, batch_id: int, quantity: int, expected_version: int
    ) -> bool:
        stmt = (
            update(StockBatch)
            .where(
                StockBatch.batch_id == batch_id,
                StockBatch.version == expected_version,
                StockBatch.quantity_remaining >= quantity,
            )
            .values(
                quantity_remaining=StockBatch.quantity_remaining - quantity,
                version=StockBatch.version + 1,
            )
        )
        result = await self._session.execute(stmt)
        return result.rowcount == 1  # ty: ignore[unresolved-attribute]

    async def increment(self, batch_id: int, quantity: int) -> None:
        stmt = (
            update(StockBatch)
            .where(StockBatch.batch_id == batch_id)
            .values(quantity_remaining=StockBatch.quantity_remaining + quantity)
        )
        await self._session.execute(stmt)

    async def get_allocations_for_order_item(
        self, order_item_id: int
    ) -> list[OrderItemBatch]:
        result = await self._session.execute(
            select(OrderItemBatch).where(OrderItemBatch.order_item_id == order_item_id)
        )
        return list(result.scalars().all())

    def record_allocation(
        self, order_item_id: int, batch_id: int, quantity: int
    ) -> None:
        self._session.add(
            OrderItemBatch(
                order_item_id=order_item_id, batch_id=batch_id, quantity=quantity
            )
        )

    async def list_expiring_soon(self, within_days: int) -> list[StockBatch]:
        cutoff = (datetime.now(UTC) + timedelta(days=within_days)).date()
        result = await self._session.execute(
            select(StockBatch)
            .where(StockBatch.expiry_date <= cutoff, StockBatch.quantity_remaining > 0)
            .order_by(StockBatch.expiry_date.asc())
        )
        return list(result.scalars().all())
