from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.supplier import Supplier


class SupplierRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, supplier: Supplier) -> None:
        self._session.add(supplier)

    async def get_by_id(self, supplier_id: int) -> Supplier | None:
        return await self._session.get(Supplier, supplier_id)

    async def list_all(self) -> list[Supplier]:
        result = await self._session.execute(select(Supplier).order_by(Supplier.name))
        return list(result.scalars().all())
