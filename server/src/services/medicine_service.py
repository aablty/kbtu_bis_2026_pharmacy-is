from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import (
    CategoryNotFoundError,
    CategoryNotLeafError,
    MedicineNotFoundError,
    SupplierNotFoundError,
)
from src.models.medicine import Medicine
from src.repositories.category_repository import CategoryRepository
from src.repositories.medicine_repository import MedicineRepository
from src.repositories.supplier_repository import SupplierRepository
from src.schemas.catalog import MedicineCreate, MedicineUpdate


class MedicineService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = MedicineRepository(session)
        self._categories = CategoryRepository(session)
        self._suppliers = SupplierRepository(session)

    async def _require_references_exist(
        self, category_id: int, supplier_id: int
    ) -> None:
        if await self._categories.get_by_id(category_id) is None:
            raise CategoryNotFoundError(category_id)
        if await self._suppliers.get_by_id(supplier_id) is None:
            raise SupplierNotFoundError(supplier_id)
        # MEDICINES.category_id must always point at a leaf category - a medicine
        # filed under a branch/root would be invisible to searches scoped more
        # narrowly than that branch, and ambiguous about where it actually sits
        # in the tree.
        if await self._categories.has_children(category_id):
            raise CategoryNotLeafError(category_id)

    async def create(self, data: MedicineCreate) -> Medicine:
        await self._require_references_exist(data.category_id, data.supplier_id)
        medicine = Medicine(**data.model_dump())
        self._repo.add(medicine)
        await self._session.commit()
        return medicine

    async def get(self, medicine_id: int) -> Medicine:
        medicine = await self._repo.get_by_id(medicine_id)
        if medicine is None:
            raise MedicineNotFoundError(medicine_id)
        return medicine

    async def search(
        self,
        *,
        q: str | None,
        category_id: int | None,
        requires_prescription: bool | None,
        limit: int,
        offset: int,
    ) -> tuple[list[Medicine], int]:
        category_ids = None
        if category_id is not None:
            if await self._categories.get_by_id(category_id) is None:
                raise CategoryNotFoundError(category_id)
            category_ids = await self._categories.get_descendant_ids(category_id)

        items = await self._repo.search(
            q=q,
            category_ids=category_ids,
            requires_prescription=requires_prescription,
            limit=limit,
            offset=offset,
        )
        total = await self._repo.count(
            q=q, category_ids=category_ids, requires_prescription=requires_prescription
        )
        return items, total

    async def update(self, medicine_id: int, data: MedicineUpdate) -> Medicine:
        medicine = await self.get(medicine_id)
        fields = data.model_dump(exclude_unset=True)

        category_id = fields.get("category_id", medicine.category_id)
        supplier_id = fields.get("supplier_id", medicine.supplier_id)
        if "category_id" in fields or "supplier_id" in fields:
            await self._require_references_exist(category_id, supplier_id)

        for field, value in fields.items():
            setattr(medicine, field, value)

        await self._session.commit()
        return medicine

    async def delete(self, medicine_id: int) -> None:
        medicine = await self.get(medicine_id)
        await self._session.delete(medicine)
        await self._session.commit()
