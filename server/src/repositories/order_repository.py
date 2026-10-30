from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.enums import OrderStatus
from src.models.order import Order
from src.models.order_item import OrderItem
from src.models.order_status_history import OrderStatusHistory


class OrderRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, order: Order) -> None:
        self._session.add(order)

    def add_item(self, item: OrderItem) -> None:
        self._session.add(item)

    def add_status_history(
        self, order_id: int, status: OrderStatus, changed_by: int | None
    ) -> None:
        self._session.add(
            OrderStatusHistory(order_id=order_id, status=status, changed_by=changed_by)
        )

    async def get_by_id(self, order_id: int) -> Order | None:
        return await self._session.get(Order, order_id)

    async def get_by_idempotency_key(self, idempotency_key: str) -> Order | None:
        result = await self._session.execute(
            select(Order).where(Order.idempotency_key == idempotency_key)
        )
        return result.scalar_one_or_none()

    async def list_for_customer(self, customer_id: int) -> list[Order]:
        result = await self._session.execute(
            select(Order)
            .where(Order.customer_id == customer_id)
            .order_by(Order.created_at.desc())
        )
        return list(result.scalars().all())

    async def list_all(self) -> list[Order]:
        result = await self._session.execute(
            select(Order).order_by(Order.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_items(self, order_id: int) -> list[OrderItem]:
        result = await self._session.execute(
            select(OrderItem).where(OrderItem.order_id == order_id)
        )
        return list(result.scalars().all())

    async def get_items_for_orders(self, order_ids: list[int]) -> list[OrderItem]:
        if not order_ids:
            return []
        result = await self._session.execute(
            select(OrderItem).where(OrderItem.order_id.in_(order_ids))
        )
        return list(result.scalars().all())
