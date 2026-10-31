from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.prescription import Prescription


class PrescriptionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, prescription: Prescription) -> None:
        self._session.add(prescription)

    async def get_by_id(self, prescription_id: int) -> Prescription | None:
        return await self._session.get(Prescription, prescription_id)

    async def list_for_customer(self, customer_id: int) -> list[Prescription]:
        result = await self._session.execute(
            select(Prescription)
            .where(Prescription.customer_id == customer_id)
            .order_by(Prescription.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_all(self) -> list[Prescription]:
        result = await self._session.execute(
            select(Prescription).order_by(Prescription.created_at.desc())
        )
        return list(result.scalars().all())
