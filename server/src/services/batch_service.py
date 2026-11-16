from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import (
    BatchNotFoundError,
    InsufficientStockError,
    MedicineNotFoundError,
    StockVersionConflictError,
    SupplierNotFoundError,
)
from src.models.medicine import Medicine
from src.models.stock_batch import StockBatch
from src.repositories.batch_repository import BatchRepository
from src.repositories.medicine_repository import MedicineRepository
from src.repositories.supplier_repository import SupplierRepository


class BatchService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._batches = BatchRepository(session)
        self._medicines = MedicineRepository(session)
        self._suppliers = SupplierRepository(session)

    async def receive_stock(
        self, medicine_id: int, supplier_id: int, quantity: int, expiry_date: date
    ) -> StockBatch:
        if await self._medicines.get_by_id(medicine_id) is None:
            raise MedicineNotFoundError(medicine_id)
        if await self._suppliers.get_by_id(supplier_id) is None:
            raise SupplierNotFoundError(supplier_id)

        batch = await self._batches.create(
            medicine_id, supplier_id, quantity, expiry_date
        )
        await self._medicines.adjust_stock_quantity(medicine_id, quantity)
        await self._session.commit()
        return batch

    async def get_by_barcode(self, barcode: str) -> StockBatch:
        batch = await self._batches.get_by_barcode(barcode)
        if batch is None:
            raise BatchNotFoundError(barcode)
        return batch

    async def get_earliest_expiry_bulk(
        self, medicine_ids: list[int]
    ) -> dict[int, date]:
        return await self._batches.get_earliest_expiry_bulk(medicine_ids)

    async def get_medicine_name(self, medicine_id: int) -> str:
        medicine = await self._medicines.get_by_id(medicine_id)
        if medicine is None:
            raise MedicineNotFoundError(medicine_id)
        return medicine.name

    async def deduct_fefo_atomic(
        self, medicine: Medicine, quantity: int
    ) -> list[tuple[int, int]]:
        """FEFO deduction for the orders path - atomic (no version check) per
        batch, same technique as MedicineRepository.decrement_stock. A
        transient per-batch race (another request grabbed it first) just
        moves on to the next candidate rather than aborting the whole line;
        only a genuine shortfall across every available batch raises."""
        allocations: list[tuple[int, int]] = []
        remaining = quantity
        while remaining > 0:
            candidates = await self._batches.list_fefo_candidates(medicine.medicine_id)
            progressed = False
            for batch in candidates:
                if remaining <= 0:
                    break
                take = min(remaining, batch.quantity_remaining)
                if await self._batches.decrement_atomic(batch.batch_id, take):
                    allocations.append((batch.batch_id, take))
                    remaining -= take
                    progressed = True
            if not progressed:
                break

        if remaining > 0:
            # Caller's transaction is rolled back by whatever catches this,
            # which undoes the decrement_atomic calls already applied above -
            # consistent with place_order's existing all-or-nothing handling.
            raise InsufficientStockError(medicine.medicine_id)

        await self._medicines.adjust_stock_quantity(medicine.medicine_id, -quantity)
        return allocations

    async def deduct_fefo_optimistic(
        self, medicine: Medicine, quantity: int
    ) -> list[tuple[int, int]]:
        """FEFO deduction for the POS sale path - optimistic-locked per
        batch. A version conflict (someone else touched this exact batch)
        fails fast, matching the existing single-counter sale semantics of
        "retry the whole sale" rather than silently retrying here."""
        allocations: list[tuple[int, int]] = []
        remaining = quantity
        while remaining > 0:
            candidates = await self._batches.list_fefo_candidates(medicine.medicine_id)
            progressed = False
            for batch in candidates:
                if remaining <= 0:
                    break
                take = min(remaining, batch.quantity_remaining)
                expected_version = batch.version
                ok = await self._batches.decrement_optimistic(
                    batch.batch_id, take, expected_version
                )
                if ok:
                    allocations.append((batch.batch_id, take))
                    remaining -= take
                    progressed = True
                    continue
                fresh = await self._batches.get_by_id(batch.batch_id)
                if fresh is not None and fresh.quantity_remaining < take:
                    # Actually out of stock now - try the next candidate.
                    continue
                raise StockVersionConflictError(medicine.medicine_id)
            if not progressed:
                break

        if remaining > 0:
            raise InsufficientStockError(medicine.medicine_id)

        await self._medicines.adjust_stock_quantity(medicine.medicine_id, -quantity)
        return allocations
