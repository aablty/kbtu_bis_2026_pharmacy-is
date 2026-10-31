from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.core.database import engine
from src.core.security import hash_password
from src.core.windows_event_loop import use_selector_event_loop_on_windows
from src.models.category import Category
from src.models.enums import FulfillmentType, OrderStatus, PaymentMethod, UserRole
from src.models.medicine import Medicine
from src.models.order import Order
from src.models.sale import Sale
from src.models.supplier import Supplier
from src.models.user import User
from src.repositories.category_repository import CategoryRepository
from src.repositories.medicine_repository import MedicineRepository
from src.repositories.sale_repository import SaleRepository
from src.repositories.supplier_repository import SupplierRepository
from src.repositories.user_repository import UserRepository
from src.schemas.orders import OrderCreate, OrderItemCreate
from src.services.order_service import OrderService

use_selector_event_loop_on_windows()


async def test_concurrent_idempotency_key_race_returns_winner_not_500() -> None:
    """Regression test: two concurrent place_order calls with the same
    Idempotency-Key can both pass the proactive "does this key exist yet"
    check before either has committed. Without catching the resulting
    IntegrityError on the loser, that request would surface as a 500 instead
    of returning the winner's order - exactly the failure idempotency keys
    exist to prevent. Uses separate sessions per "request", matching
    test_otp_service.py's pattern, since this is about transaction/commit
    boundaries a single shared session can't faithfully simulate.

    Note: the fake pre-check below is a plain async closure, not
    unittest.mock.AsyncMock - AsyncMock interferes with SQLAlchemy's
    greenlet-based async bridge here (reproducibly raises
    sqlalchemy.exc.MissingGreenlet on the next savepoint), so a real
    coroutine function is used instead."""
    async with engine.connect() as connection:
        await connection.begin()
        session_factory = async_sessionmaker(
            bind=connection,
            expire_on_commit=False,
            autoflush=False,
            join_transaction_mode="create_savepoint",
        )
        try:
            shared_key = "race-key"

            # "Request 0": seed a customer and a purchasable medicine.
            async with session_factory() as session_zero:
                customer = User(
                    email="order-race-customer@example.com",
                    password_hash=hash_password("irrelevant-password-1"),
                    role=UserRole.CUSTOMER,
                )
                UserRepository(session_zero).add(customer)

                supplier = Supplier(name="Race Supplier")
                SupplierRepository(session_zero).add(supplier)
                category = Category(name="Race Category", slug="race-category")
                CategoryRepository(session_zero).add(category)
                await session_zero.flush()

                medicine = Medicine(
                    name="Race Medicine",
                    price=Decimal("5.00"),
                    category_id=category.category_id,
                    supplier_id=supplier.supplier_id,
                    stock_quantity=10,
                )
                MedicineRepository(session_zero).add(medicine)
                await session_zero.commit()
                customer_id = customer.user_id
                medicine_id = medicine.medicine_id

            order_data = OrderCreate(
                items=[OrderItemCreate(medicine_id=medicine_id, quantity=1)],
                fulfillment_type=FulfillmentType.PICKUP,
                payment_method=PaymentMethod.CARD_SIMULATED,
            )

            # "Request 1": places the order normally and wins the race.
            async with session_factory() as session_one:
                first_order = await OrderService(session_one).place_order(
                    customer_id, order_data, shared_key
                )
                first_order_id = first_order.order_id

            # "Request 2": a fresh session whose own pre-check still (wrongly)
            # reports no existing order on its first call - simulating having
            # run concurrently with Request 1, before that commit was visible -
            # but tells the truth from the second call on, once its own INSERT
            # has failed and it needs to recover.
            async with session_factory() as session_two:
                racy_service = OrderService(session_two)
                real_lookup = racy_service._orders.get_by_idempotency_key
                call_count = 0

                async def lying_once_then_real(key: str) -> Order | None:
                    nonlocal call_count
                    call_count += 1
                    if call_count == 1:
                        return None
                    return await real_lookup(key)

                # Deliberately replacing a bound method with a plain function
                # for this test - ty sees a type mismatch against the
                # descriptor's bound-method type, but the call signature
                # (minus self) and return type match exactly.
                racy_service._orders.get_by_idempotency_key = (  # ty: ignore[invalid-assignment]
                    lying_once_then_real
                )

                order = await racy_service.place_order(
                    customer_id, order_data, shared_key
                )
                assert order.order_id == first_order_id

            # Stock should only have been decremented once, not twice.
            async with session_factory() as session_three:
                medicine_after = await MedicineRepository(session_three).get_by_id(
                    medicine_id
                )
                assert medicine_after is not None
                assert medicine_after.stock_quantity == 9
        finally:
            await connection.rollback()


async def test_concurrent_order_completion_returns_winner_not_500() -> None:
    """Regression test: two concurrent "complete this order" requests can
    both pass the state-machine check before either commits, and both try to
    create the order's SALE row - SALES.order_id is unique, so the loser's
    INSERT fails. update_status must recover (return the winner's order)
    instead of surfacing an unhandled IntegrityError as a 500.

    Simulates this by seeding the conflicting Sale row directly (standing in
    for "a concurrent request already won") and forcing
    SaleService.create_from_order's own proactive duplicate check to lie
    about it not existing yet - the same "lying once" shape as the
    idempotency-key race test above, applied one layer deeper since this
    race is on SALES.order_id rather than ORDERS.idempotency_key."""
    async with engine.connect() as connection:
        await connection.begin()
        session_factory = async_sessionmaker(
            bind=connection,
            expire_on_commit=False,
            autoflush=False,
            join_transaction_mode="create_savepoint",
        )
        try:
            async with session_factory() as session_zero:
                customer = User(
                    email="completion-race-customer@example.com",
                    password_hash=hash_password("irrelevant-password-1"),
                    role=UserRole.CUSTOMER,
                )
                employee = User(
                    email="completion-race-employee@example.com",
                    password_hash=hash_password("irrelevant-password-1"),
                    role=UserRole.CASHIER,
                )
                UserRepository(session_zero).add(customer)
                UserRepository(session_zero).add(employee)

                supplier = Supplier(name="Completion Race Supplier")
                SupplierRepository(session_zero).add(supplier)
                category = Category(
                    name="Completion Race Category", slug="completion-race"
                )
                CategoryRepository(session_zero).add(category)
                await session_zero.flush()

                medicine = Medicine(
                    name="Completion Race Medicine",
                    price=Decimal("5.00"),
                    category_id=category.category_id,
                    supplier_id=supplier.supplier_id,
                    stock_quantity=10,
                )
                MedicineRepository(session_zero).add(medicine)
                await session_zero.flush()
                customer_id = customer.user_id
                employee_id = employee.user_id
                medicine_id = medicine.medicine_id

                order = await OrderService(session_zero).place_order(
                    customer_id,
                    OrderCreate(
                        items=[OrderItemCreate(medicine_id=medicine_id, quantity=1)],
                        fulfillment_type=FulfillmentType.PICKUP,
                        payment_method=PaymentMethod.CARD_SIMULATED,
                    ),
                    None,
                )
                order_id = order.order_id
                await OrderService(session_zero).update_status(
                    order_id, OrderStatus.READY, employee_id
                )

                # Stands in for "a concurrent request already completed this
                # order" - the order itself stays READY, only the sale exists,
                # which is exactly the DB state a losing request would race into.
                SaleRepository(session_zero).add(
                    Sale(
                        order_id=order_id,
                        customer_id=customer_id,
                        employee_id=employee_id,
                        total_amount=order.total_amount,
                    )
                )
                await session_zero.commit()

            async with session_factory() as session_one:
                racy_service = OrderService(session_one)
                real_lookup = racy_service._sales._sales.get_by_order_id
                call_count = 0

                async def lying_once_then_real(oid: int) -> Sale | None:
                    nonlocal call_count
                    call_count += 1
                    if call_count == 1:
                        return None
                    return await real_lookup(oid)

                racy_service._sales._sales.get_by_order_id = (  # ty: ignore[invalid-assignment]
                    lying_once_then_real
                )

                result = await racy_service.update_status(
                    order_id, OrderStatus.COMPLETED, employee_id
                )
                # Recovers to the winner's sale/order rather than raising.
                assert result.order_id == order_id

            async with session_factory() as session_two:
                sales_for_order = await session_two.execute(
                    select(Sale).where(Sale.order_id == order_id)
                )
                assert len(sales_for_order.scalars().all()) == 1
        finally:
            await connection.rollback()
