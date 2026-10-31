from decimal import Decimal

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.core.database import engine
from src.core.exceptions import StockVersionConflictError
from src.core.security import hash_password
from src.core.windows_event_loop import use_selector_event_loop_on_windows
from src.models.category import Category
from src.models.enums import UserRole
from src.models.medicine import Medicine
from src.models.supplier import Supplier
from src.models.user import User
from src.repositories.category_repository import CategoryRepository
from src.repositories.medicine_repository import MedicineRepository
from src.repositories.supplier_repository import SupplierRepository
from src.repositories.user_repository import UserRepository
from src.schemas.sales import SaleItemCreate
from src.services.sale_service import SaleService

use_selector_event_loop_on_windows()


async def _seed_medicine(session: AsyncSession, *, stock_quantity: int = 10) -> int:
    supplier = Supplier(name="Test Supplier")
    SupplierRepository(session).add(supplier)
    category = Category(name="Test Category", slug=f"test-category-{id(session)}")
    CategoryRepository(session).add(category)
    await session.flush()

    medicine = Medicine(
        name="Test Medicine",
        price=Decimal("5.00"),
        category_id=category.category_id,
        supplier_id=supplier.supplier_id,
        stock_quantity=stock_quantity,
    )
    MedicineRepository(session).add(medicine)
    await session.commit()
    return medicine.medicine_id


async def _seed_employee(session: AsyncSession, role: UserRole) -> int:
    user = User(
        email=f"{role.value}-{id(session)}@example.com",
        password_hash=hash_password("irrelevant-password-1"),
        role=role,
    )
    UserRepository(session).add(user)
    await session.commit()
    return user.user_id


async def test_decrement_stock_optimistic_rejects_stale_version() -> None:
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
                medicine_id = await _seed_medicine(session_zero, stock_quantity=10)

            async with session_factory() as session_one:
                repo = MedicineRepository(session_one)
                medicine = await repo.get_by_id(medicine_id)
                assert medicine is not None
                stale_version = medicine.version

                # A real concurrent write on a separate session bumps the
                # version before this session gets to act on its own read.
                async with session_factory() as session_two:
                    await MedicineRepository(session_two).increment_stock(
                        medicine_id, 0
                    )
                    await session_two.commit()

                assert (
                    await repo.decrement_stock_optimistic(medicine_id, 1, stale_version)
                    is False
                )

                fresh = await repo.get_by_id(medicine_id)
                assert fresh is not None
                assert (
                    await repo.decrement_stock_optimistic(medicine_id, 1, fresh.version)
                    is True
                )
                await session_one.commit()

            async with session_factory() as session_three:
                after = await MedicineRepository(session_three).get_by_id(medicine_id)
                assert after is not None
                assert after.stock_quantity == 9
        finally:
            await connection.rollback()


async def test_process_pos_sale_raises_conflict_on_concurrent_write() -> None:
    """Regression test: SaleService.process_pos_sale must distinguish a
    version conflict from insufficient stock - both look like "0 rows
    updated" from the repository alone. Uses two separate sessions on one
    connection, matching test_otp_service.py/test_order_service.py's
    pattern: each session's identity map only reflects what *it* has
    committed, so session_one's own read of the medicine stays "stale"
    once session_two commits a real concurrent write - the same situation
    two real concurrent requests would produce, no mocking required."""
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
                medicine_id = await _seed_medicine(session_zero, stock_quantity=10)
                employee_id = await _seed_employee(session_zero, UserRole.CASHIER)

            async with session_factory() as session_one:
                service = SaleService(session_one)
                # Primes session_one's identity map - process_pos_sale's own
                # internal get_by_id() will return this same cached object.
                stale = await MedicineRepository(session_one).get_by_id(medicine_id)
                assert stale is not None

                async with session_factory() as session_two:
                    ok = await MedicineRepository(
                        session_two
                    ).decrement_stock_optimistic(medicine_id, 1, stale.version)
                    # Proves the concurrent write actually landed at the SQL
                    # level - not re-checked after session_one unwinds below,
                    # since session_two's savepoint is nested *inside*
                    # session_one's still-open one here (deliberately, so
                    # session_one keeps the stale cached read alive) - when
                    # session_one's own later failure rolls its savepoint
                    # back, that discards session_two's nested work too, the
                    # same way ROLLBACK TO SAVEPOINT always discards anything
                    # established after it, released or not. Not a production
                    # bug: durability across a clean (non-nested) commit is
                    # already covered by the test above.
                    assert ok is True
                    await session_two.commit()

                with pytest.raises(StockVersionConflictError):
                    await service.process_pos_sale(
                        employee_id,
                        None,
                        [SaleItemCreate(medicine_id=medicine_id, quantity=1)],
                    )
        finally:
            await connection.rollback()
