from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.payment import Payment


class PaymentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, payment: Payment) -> None:
        self._session.add(payment)

    async def get_latest_for_order(self, order_id: int) -> Payment | None:
        result = await self._session.execute(
            select(Payment)
            .where(Payment.order_id == order_id)
            .order_by(Payment.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_latest_for_orders(self, order_ids: list[int]) -> list[Payment]:
        if not order_ids:
            return []
        result = await self._session.execute(
            select(Payment)
            .where(Payment.order_id.in_(order_ids))
            .order_by(Payment.created_at)
        )
        return list(result.scalars().all())
