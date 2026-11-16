from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.core.database import engine
from src.core.email import ConsoleEmailSender
from src.core.exceptions import InsufficientStockError, StockVersionConflictError
from src.core.security import hash_password
from src.core.windows_event_loop import use_selector_event_loop_on_windows
from src.models.category import Category
from src.models.enums import FulfillmentType, OrderStatus, PaymentMethod, UserRole
from src.models.medicine import Medicine
from src.models.supplier import Supplier
from src.models.user import User
from src.repositories.batch_repository import BatchRepository
from src.repositories.category_repository import CategoryRepository
from src.repositories.medicine_repository import MedicineRepository
from src.repositories.supplier_repository import SupplierRepository
from src.repositories.user_repository import UserRepository
from src.schemas.orders import OrderCreate, OrderItemCreate
from src.services.batch_service import BatchService
from src.services.notification_service import NotificationService
from src.services.order_service import OrderService
from src.services.otp_service import OtpService

use_selector_event_loop_on_windows()

_SOON = date.today() + timedelta(days=10)
_LATER = date.today() + timedelta(days=100)


def _order_service(session: AsyncSession) -> OrderService:
    return OrderService(
        session, OtpService(session, ConsoleEmailSender()), NotificationService(session)
    )


async def _seed_medicine_and_supplier(
    session: AsyncSession, *, stock_quantity: int = 0
) -> tuple[int, int]:
    """-> (medicine_id, supplier_id). No batch is created here - callers
    receive stock explicitly via BatchService so tests control expiry dates."""
    supplier = Supplier(name=f"Batch Test Supplier {id(session)}")
    SupplierRepository(session).add(supplier)
    category = Category(name="Batch Test Category", slug=f"batch-test-{id(session)}")
    CategoryRepository(session).add(category)
    await session.flush()

    medicine = Medicine(
        name="Batch Test Medicine",
        price=Decimal("5.00"),
        category_id=category.category_id,
        supplier_id=supplier.supplier_id,
        stock_quantity=stock_quantity,
    )
    MedicineRepository(session).add(medicine)
    await session.commit()
    return medicine.medicine_id, supplier.supplier_id


async def test_receive_stock_creates_batch_and_bumps_medicine_stock(
    db_session: AsyncSession,
) -> None:
    medicine_id, supplier_id = await _seed_medicine_and_supplier(db_session)
    service = BatchService(db_session)

    batch = await service.receive_stock(medicine_id, supplier_id, 20, _LATER)

    assert batch.quantity_remaining == 20
    assert batch.quantity_received == 20
    assert batch.barcode is not None

    medicine = await MedicineRepository(db_session).get_by_id(medicine_id)
    assert medicine is not None
    assert medicine.stock_quantity == 20


async def test_fefo_deducts_from_earliest_expiry_batch_first(
    db_session: AsyncSession,
) -> None:
    medicine_id, supplier_id = await _seed_medicine_and_supplier(db_session)
    service = BatchService(db_session)
    early = await service.receive_stock(medicine_id, supplier_id, 5, _SOON)
    late = await service.receive_stock(medicine_id, supplier_id, 5, _LATER)

    medicine = await MedicineRepository(db_session).get_by_id(medicine_id)
    assert medicine is not None
    allocations = await service.deduct_fefo_atomic(medicine, 3)

    assert allocations == [(early.batch_id, 3)]
    batches = BatchRepository(db_session)
    early_after = await batches.get_by_id(early.batch_id)
    late_after = await batches.get_by_id(late.batch_id)
    assert early_after is not None and early_after.quantity_remaining == 2
    assert late_after is not None and late_after.quantity_remaining == 5


async def test_fefo_splits_across_batches_when_earliest_is_insufficient(
    db_session: AsyncSession,
) -> None:
    medicine_id, supplier_id = await _seed_medicine_and_supplier(db_session)
    service = BatchService(db_session)
    early = await service.receive_stock(medicine_id, supplier_id, 3, _SOON)
    late = await service.receive_stock(medicine_id, supplier_id, 5, _LATER)

    medicine = await MedicineRepository(db_session).get_by_id(medicine_id)
    assert medicine is not None
    allocations = await service.deduct_fefo_atomic(medicine, 5)

    assert set(allocations) == {(early.batch_id, 3), (late.batch_id, 2)}
    batches = BatchRepository(db_session)
    early_after = await batches.get_by_id(early.batch_id)
    late_after = await batches.get_by_id(late.batch_id)
    assert early_after is not None and early_after.quantity_remaining == 0
    assert late_after is not None and late_after.quantity_remaining == 3


async def test_insufficient_stock_across_all_batches_raises_and_nothing_commits(
    db_session: AsyncSession,
) -> None:
    medicine_id, supplier_id = await _seed_medicine_and_supplier(db_session)
    service = BatchService(db_session)
    await service.receive_stock(medicine_id, supplier_id, 3, _SOON)

    medicine = await MedicineRepository(db_session).get_by_id(medicine_id)
    assert medicine is not None

    with pytest.raises(InsufficientStockError):
        await service.deduct_fefo_atomic(medicine, 10)


async def test_cancelling_order_restocks_the_exact_batches_it_drew_from(
    db_session: AsyncSession,
) -> None:
    customer = User(
        email="batch-cancel-customer@example.com",
        password_hash=hash_password("irrelevant-password-1"),
        role=UserRole.CUSTOMER,
    )
    UserRepository(db_session).add(customer)
    medicine_id, supplier_id = await _seed_medicine_and_supplier(db_session)
    batch_service = BatchService(db_session)
    early = await batch_service.receive_stock(medicine_id, supplier_id, 3, _SOON)
    late = await batch_service.receive_stock(medicine_id, supplier_id, 5, _LATER)
    await db_session.flush()
    customer_id = customer.user_id

    order = await _order_service(db_session).place_order(
        customer_id,
        OrderCreate(
            items=[OrderItemCreate(medicine_id=medicine_id, quantity=5)],
            fulfillment_type=FulfillmentType.PICKUP,
            payment_method=PaymentMethod.CARD_SIMULATED,
        ),
        None,
    )

    batches = BatchRepository(db_session)
    early_mid = await batches.get_by_id(early.batch_id)
    late_mid = await batches.get_by_id(late.batch_id)
    assert early_mid is not None and early_mid.quantity_remaining == 0
    assert late_mid is not None and late_mid.quantity_remaining == 3

    await _order_service(db_session).update_status(
        order.order_id, OrderStatus.CANCELLED, changed_by=None
    )

    early_after = await batches.get_by_id(early.batch_id)
    late_after = await batches.get_by_id(late.batch_id)
    assert early_after is not None and early_after.quantity_remaining == 3
    assert late_after is not None and late_after.quantity_remaining == 5

    medicine = await MedicineRepository(db_session).get_by_id(medicine_id)
    assert medicine is not None
    assert medicine.stock_quantity == 8


async def test_get_by_barcode_round_trip_returns_medicine_and_remaining_quantity(
    db_session: AsyncSession,
) -> None:
    medicine_id, supplier_id = await _seed_medicine_and_supplier(db_session)
    service = BatchService(db_session)
    batch = await service.receive_stock(medicine_id, supplier_id, 7, _LATER)
    assert batch.barcode is not None

    found = await service.get_by_barcode(batch.barcode)
    assert found.batch_id == batch.batch_id
    assert found.quantity_remaining == 7
    name = await service.get_medicine_name(found.medicine_id)
    assert name == "Batch Test Medicine"


async def test_concurrent_atomic_deduction_does_not_oversell_a_single_batch() -> None:
    """Regression test for the orders FEFO path: two sessions race to take
    the last units of one batch that can only satisfy one of them. The loser
    must not oversell - it raises InsufficientStockError since no other
    batch exists to fall back on."""
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
                medicine_id, supplier_id = await _seed_medicine_and_supplier(
                    session_zero
                )
                batch = await BatchService(session_zero).receive_stock(
                    medicine_id, supplier_id, 1, _LATER
                )
                batch_id = batch.batch_id

            async with session_factory() as session_one:
                medicine_one = await MedicineRepository(session_one).get_by_id(
                    medicine_id
                )
                assert medicine_one is not None

                async with session_factory() as session_two:
                    ok = await BatchRepository(session_two).decrement_atomic(
                        batch_id, 1
                    )
                    assert ok is True
                    await session_two.commit()

                with pytest.raises(InsufficientStockError):
                    await BatchService(session_one).deduct_fefo_atomic(medicine_one, 1)
        finally:
            await connection.rollback()


async def test_concurrent_optimistic_deduction_raises_version_conflict() -> None:
    """Regression test for the sales FEFO path: a genuine version conflict
    on the same batch must raise StockVersionConflictError, not be silently
    lost or misreported as insufficient stock."""
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
                medicine_id, supplier_id = await _seed_medicine_and_supplier(
                    session_zero
                )
                batch = await BatchService(session_zero).receive_stock(
                    medicine_id, supplier_id, 10, _LATER
                )
                batch_id = batch.batch_id

            async with session_factory() as session_one:
                medicine_one = await MedicineRepository(session_one).get_by_id(
                    medicine_id
                )
                assert medicine_one is not None
                # Primes session_one's identity map with the batch - the
                # service's own list_fefo_candidates() call below will reuse
                # this same stale cached object instead of a fresh row.
                stale = await BatchRepository(session_one).get_by_id(batch_id)
                assert stale is not None

                async with session_factory() as session_two:
                    ok = await BatchRepository(session_two).decrement_optimistic(
                        batch_id, 1, stale.version
                    )
                    assert ok is True
                    await session_two.commit()

                with pytest.raises(StockVersionConflictError):
                    await BatchService(session_one).deduct_fefo_optimistic(
                        medicine_one, 1
                    )
        finally:
            await connection.rollback()
