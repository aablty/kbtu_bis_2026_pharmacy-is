from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import EntityInUseError, SupplierNotFoundError
from src.models.supplier import Supplier
from src.repositories.supplier_repository import SupplierRepository
from src.schemas.catalog import SupplierCreate, SupplierUpdate


class SupplierService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = SupplierRepository(session)

    async def create(self, data: SupplierCreate) -> Supplier:
        supplier = Supplier(**data.model_dump())
        self._repo.add(supplier)
        await self._session.commit()
        return supplier

    async def get(self, supplier_id: int) -> Supplier:
        supplier = await self._repo.get_by_id(supplier_id)
        if supplier is None:
            raise SupplierNotFoundError(supplier_id)
        return supplier

    async def list_all(self) -> list[Supplier]:
        return await self._repo.list_all()

    async def update(self, supplier_id: int, data: SupplierUpdate) -> Supplier:
        supplier = await self.get(supplier_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(supplier, field, value)
        await self._session.commit()
        return supplier

    async def delete(self, supplier_id: int) -> None:
        supplier = await self.get(supplier_id)
        await self._session.delete(supplier)
        try:
            await self._session.commit()
        except IntegrityError:
            await self._session.rollback()
            raise EntityInUseError(supplier_id) from None
