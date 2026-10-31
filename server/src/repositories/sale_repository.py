from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.sale import Sale
from src.models.sale_item import SaleItem


class SaleRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, sale: Sale) -> None:
        self._session.add(sale)

    def add_item(self, item: SaleItem) -> None:
        self._session.add(item)

    async def get_by_id(self, sale_id: int) -> Sale | None:
        return await self._session.get(Sale, sale_id)

    async def get_by_order_id(self, order_id: int) -> Sale | None:
        result = await self._session.execute(
            select(Sale).where(Sale.order_id == order_id)
        )
        return result.scalar_one_or_none()

    async def list_all(self) -> list[Sale]:
        result = await self._session.execute(
            select(Sale).order_by(Sale.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_items(self, sale_id: int) -> list[SaleItem]:
        result = await self._session.execute(
            select(SaleItem).where(SaleItem.sale_id == sale_id)
        )
        return list(result.scalars().all())

    async def get_items_for_sales(self, sale_ids: list[int]) -> list[SaleItem]:
        if not sale_ids:
            return []
        result = await self._session.execute(
            select(SaleItem).where(SaleItem.sale_id.in_(sale_ids))
        )
        return list(result.scalars().all())
