from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.medicine import Medicine
from src.models.stock_batch import BatchWriteOff, OrderItemBatch, StockBatch
from src.models.supplier import Supplier
from src.models.user import User


class BatchRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        medicine_id: int,
        supplier_id: int,
        quantity: int,
        expiry_date: date,
        received_by: int | None = None,
    ) -> StockBatch:
        batch = StockBatch(
            medicine_id=medicine_id,
            supplier_id=supplier_id,
            quantity_received=quantity,
            quantity_remaining=quantity,
            expiry_date=expiry_date,
            barcode=None,
            received_by=received_by,
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

    async def get_earliest_expiry_bulk(
        self, medicine_ids: list[int]
    ) -> dict[int, date]:
        """Nearest expiry date among each medicine's in-stock batches - what
        the public catalog should show instead of MEDICINES.expiry_date,
        which predates batches and never changes as stock turns over."""
        if not medicine_ids:
            return {}
        result = await self._session.execute(
            select(StockBatch.medicine_id, func.min(StockBatch.expiry_date))
            .where(
                StockBatch.medicine_id.in_(medicine_ids),
                StockBatch.quantity_remaining > 0,
            )
            .group_by(StockBatch.medicine_id)
        )
        return dict(result.all())

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

    async def list_recent(
        self, received_by: int | None, limit: int
    ) -> list[tuple[StockBatch, str | None, str]]:
        stmt = (
            select(StockBatch, User.full_name, User.email, Medicine.name)
            .outerjoin(User, User.user_id == StockBatch.received_by)
            .join(Medicine, Medicine.medicine_id == StockBatch.medicine_id)
            .order_by(StockBatch.received_at.desc())
            .limit(limit)
        )
        if received_by is not None:
            stmt = stmt.where(StockBatch.received_by == received_by)
        result = await self._session.execute(stmt)
        return [
            (
                batch,
                (full_name or email) if batch.received_by is not None else None,
                medicine_name,
            )
            for batch, full_name, email, medicine_name in result
        ]

    async def create_write_off(
        self, batch_id: int, quantity: int, reason: str | None, written_off_by: int
    ) -> BatchWriteOff:
        write_off = BatchWriteOff(
            batch_id=batch_id,
            quantity=quantity,
            reason=reason,
            written_off_by=written_off_by,
        )
        self._session.add(write_off)
        await self._session.flush()
        return write_off

    async def list_write_offs(
        self, since: datetime | None, limit: int
    ) -> list[tuple[BatchWriteOff, StockBatch, str, str | None]]:
        stmt = (
            select(BatchWriteOff, StockBatch, Medicine.name, User.full_name, User.email)
            .join(StockBatch, StockBatch.batch_id == BatchWriteOff.batch_id)
            .join(Medicine, Medicine.medicine_id == StockBatch.medicine_id)
            .outerjoin(User, User.user_id == BatchWriteOff.written_off_by)
            .order_by(BatchWriteOff.written_off_at.desc())
            .limit(limit)
        )
        if since is not None:
            stmt = stmt.where(BatchWriteOff.written_off_at >= since)
        result = await self._session.execute(stmt)
        return [
            (write_off, batch, medicine_name, full_name or email)
            for write_off, batch, medicine_name, full_name, email in result
        ]

    async def get_allocations_for_order_items(
        self, order_item_ids: list[int]
    ) -> list[tuple[int, OrderItemBatch, StockBatch, Supplier]]:
        if not order_item_ids:
            return []
        stmt = (
            select(OrderItemBatch, StockBatch, Supplier)
            .join(StockBatch, StockBatch.batch_id == OrderItemBatch.batch_id)
            .join(Supplier, Supplier.supplier_id == StockBatch.supplier_id)
            .where(OrderItemBatch.order_item_id.in_(order_item_ids))
        )
        result = await self._session.execute(stmt)
        return [
            (order_item_batch.order_item_id, order_item_batch, batch, supplier)
            for order_item_batch, batch, supplier in result
        ]
