from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import (
    IdempotencyKeyConflictError,
    InsufficientStockError,
    InvalidOrderStatusTransitionError,
    MedicineNotFoundError,
    OrderNotFoundError,
)
from src.models.enums import OrderStatus, PaymentStatus
from src.models.order import Order
from src.models.order_item import OrderItem
from src.models.payment import Payment
from src.repositories.medicine_repository import MedicineRepository
from src.repositories.order_repository import OrderRepository
from src.repositories.payment_repository import PaymentRepository
from src.schemas.orders import OrderCreate
from src.services.sale_service import SaleService

# A terminal status (empty set) has no further transitions - COMPLETED and
# CANCELLED are both dead ends by design, matching a real order's lifecycle.
_ALLOWED_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.READY, OrderStatus.CANCELLED},
    OrderStatus.READY: {OrderStatus.COMPLETED, OrderStatus.CANCELLED},
    OrderStatus.COMPLETED: set(),
    OrderStatus.CANCELLED: set(),
}


class OrderService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._orders = OrderRepository(session)
        self._medicines = MedicineRepository(session)
        self._payments = PaymentRepository(session)
        self._sales = SaleService(session)

    async def place_order(
        self, customer_id: int, data: OrderCreate, idempotency_key: str | None
    ) -> Order:
        if idempotency_key:
            existing = await self._orders.get_by_idempotency_key(idempotency_key)
            if existing is not None:
                # Only a safe replay of this same customer's own request - a
                # match belonging to someone else is a genuine key collision,
                # not something we should ever hand back.
                if existing.customer_id != customer_id:
                    raise IdempotencyKeyConflictError(idempotency_key)
                return existing

        medicines = []
        for item in data.items:
            medicine = await self._medicines.get_by_id(item.medicine_id)
            if medicine is None:
                raise MedicineNotFoundError(item.medicine_id)
            medicines.append(medicine)

        total_amount = sum(
            (
                medicine.price * item.quantity
                for medicine, item in zip(medicines, data.items, strict=True)
            ),
            start=Decimal(0),
        )

        order = Order(
            customer_id=customer_id,
            status=OrderStatus.PENDING,
            fulfillment_type=data.fulfillment_type,
            delivery_address=data.delivery_address,
            total_amount=total_amount,
            idempotency_key=idempotency_key,
        )
        self._orders.add(order)
        try:
            # Need order.order_id for the FK rows below - this flush is also
            # where the idempotency_key unique constraint actually fires, not
            # at the final commit, since this INSERT is sent immediately.
            await self._session.flush()
        except IntegrityError:
            # Two concurrent requests with the same key can both pass the
            # check above before either flushes. Whichever loses this race
            # rolls back and returns the winner's order instead of a 500 -
            # the same recovery shape as CategoryService's slug-uniqueness race.
            await self._session.rollback()
            if idempotency_key:
                winner = await self._orders.get_by_idempotency_key(idempotency_key)
                if winner is not None and winner.customer_id == customer_id:
                    return winner
            raise
        self._orders.add_status_history(
            order.order_id, OrderStatus.PENDING, changed_by=customer_id
        )

        for medicine, item in zip(medicines, data.items, strict=True):
            if not await self._medicines.decrement_stock(
                medicine.medicine_id, item.quantity
            ):
                raise InsufficientStockError(medicine.medicine_id)
            self._orders.add_item(
                OrderItem(
                    order_id=order.order_id,
                    medicine_id=medicine.medicine_id,
                    quantity=item.quantity,
                    unit_price=medicine.price,
                    medicine_name=medicine.name,
                )
            )

        # Payment is simulated - no real gateway, so it always succeeds instantly
        # and the order moves straight from pending to confirmed.
        self._payments.add(
            Payment(
                order_id=order.order_id,
                amount=total_amount,
                method=data.payment_method,
                status=PaymentStatus.PAID,
                paid_at=datetime.now(UTC),
            )
        )
        order.status = OrderStatus.CONFIRMED
        self._orders.add_status_history(
            order.order_id, OrderStatus.CONFIRMED, changed_by=None
        )

        await self._session.commit()
        return order

    async def get(self, order_id: int) -> Order:
        order = await self._orders.get_by_id(order_id)
        if order is None:
            raise OrderNotFoundError(order_id)
        return order

    async def get_items(self, order_id: int) -> list[OrderItem]:
        return await self._orders.get_items(order_id)

    async def get_payment(self, order_id: int) -> Payment | None:
        return await self._payments.get_latest_for_order(order_id)

    async def list_for_customer(self, customer_id: int) -> list[Order]:
        return await self._orders.list_for_customer(customer_id)

    async def list_all(self) -> list[Order]:
        return await self._orders.list_all()

    async def get_items_for_orders(self, order_ids: list[int]) -> list[OrderItem]:
        return await self._orders.get_items_for_orders(order_ids)

    async def get_payments_for_orders(self, order_ids: list[int]) -> list[Payment]:
        return await self._payments.get_latest_for_orders(order_ids)

    async def update_status(
        self, order_id: int, new_status: OrderStatus, changed_by: int | None
    ) -> Order:
        order = await self.get(order_id)
        if new_status not in _ALLOWED_TRANSITIONS[order.status]:
            raise InvalidOrderStatusTransitionError(
                order.status.value, new_status.value
            )

        if new_status == OrderStatus.CANCELLED:
            for item in await self._orders.get_items(order_id):
                await self._medicines.increment_stock(item.medicine_id, item.quantity)

            # Payment is simulated, so there's no real gateway refund to call -
            # but the record should still reflect that the money isn't owed
            # anymore, rather than leaving a cancelled order showing "paid".
            payment = await self._payments.get_latest_for_order(order_id)
            if payment is not None and payment.status == PaymentStatus.PAID:
                payment.status = PaymentStatus.REFUNDED

        if new_status == OrderStatus.COMPLETED:
            if changed_by is None:
                raise ValueError("completing an order requires an acting employee")
            order_items = await self._orders.get_items(order_id)
            try:
                await self._sales.create_from_order(order, order_items, changed_by)
            except IntegrityError:
                # Two concurrent completion requests can both pass the
                # transition check above before either commits -
                # SALES.order_id's unique constraint catches the loser here.
                # Nothing else in this transaction has been written yet on
                # this path, so rolling back only discards this attempt; the
                # winner already recorded the sale and completed the order,
                # so just return its result instead of erroring.
                await self._session.rollback()
                return await self.get(order_id)

        order.status = new_status
        self._orders.add_status_history(order_id, new_status, changed_by)
        await self._session.commit()
        return order
