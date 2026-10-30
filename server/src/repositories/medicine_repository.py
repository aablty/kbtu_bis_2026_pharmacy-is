from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select

from src.models.medicine import Medicine


class MedicineRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, medicine: Medicine) -> None:
        self._session.add(medicine)

    async def get_by_id(self, medicine_id: int) -> Medicine | None:
        return await self._session.get(Medicine, medicine_id)

    @staticmethod
    def _filtered(
        stmt: Select,
        *,
        q: str | None,
        category_ids: list[int] | None,
        requires_prescription: bool | None,
    ) -> Select:
        if q:
            pattern = f"%{q}%"
            stmt = stmt.where(
                or_(Medicine.name.ilike(pattern), Medicine.manufacturer.ilike(pattern))
            )
        if category_ids is not None:
            stmt = stmt.where(Medicine.category_id.in_(category_ids))
        if requires_prescription is not None:
            stmt = stmt.where(Medicine.requires_prescription == requires_prescription)
        return stmt

    async def search(
        self,
        *,
        q: str | None = None,
        category_ids: list[int] | None = None,
        requires_prescription: bool | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Medicine]:
        stmt = self._filtered(
            select(Medicine),
            q=q,
            category_ids=category_ids,
            requires_prescription=requires_prescription,
        )
        stmt = stmt.order_by(Medicine.name).limit(limit).offset(offset)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def count(
        self,
        *,
        q: str | None = None,
        category_ids: list[int] | None = None,
        requires_prescription: bool | None = None,
    ) -> int:
        stmt = self._filtered(
            select(func.count(Medicine.medicine_id)),
            q=q,
            category_ids=category_ids,
            requires_prescription=requires_prescription,
        )
        result = await self._session.execute(stmt)
        return result.scalar_one()

    async def decrement_stock(self, medicine_id: int, quantity: int) -> bool:
        """Atomic conditional decrement - the WHERE guard means two concurrent
        orders can't both succeed in overselling the last units, without
        needing a separate version column for this particular race."""
        stmt = (
            update(Medicine)
            .where(
                Medicine.medicine_id == medicine_id, Medicine.stock_quantity >= quantity
            )
            .values(stock_quantity=Medicine.stock_quantity - quantity)
        )
        result = await self._session.execute(stmt)
        return result.rowcount == 1

    async def increment_stock(self, medicine_id: int, quantity: int) -> None:
        stmt = (
            update(Medicine)
            .where(Medicine.medicine_id == medicine_id)
            .values(stock_quantity=Medicine.stock_quantity + quantity)
        )
        await self._session.execute(stmt)
