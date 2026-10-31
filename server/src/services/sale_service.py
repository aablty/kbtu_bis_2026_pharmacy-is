from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import (
    InsufficientStockError,
    InvalidSaleCustomerError,
    MedicineNotFoundError,
    SaleNotFoundError,
    StockVersionConflictError,
    UserNotFoundError,
)
from src.models.enums import UserRole
from src.models.order import Order
from src.models.order_item import OrderItem
from src.models.sale import Sale
from src.models.sale_item import SaleItem
from src.repositories.medicine_repository import MedicineRepository
from src.repositories.sale_repository import SaleRepository
from src.repositories.user_repository import UserRepository
from src.schemas.sales import SaleItemCreate


class SaleService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._sales = SaleRepository(session)
        self._medicines = MedicineRepository(session)
        self._users = UserRepository(session)

    async def process_pos_sale(
        self, employee_id: int, customer_id: int | None, items: list[SaleItemCreate]
    ) -> Sale:
        if customer_id is not None:
            customer = await self._users.get_by_id(customer_id)
            if customer is None:
                raise UserNotFoundError(customer_id)
            if customer.role != UserRole.CUSTOMER:
                raise InvalidSaleCustomerError(customer_id)

        medicines = []
        for item in items:
            medicine = await self._medicines.get_by_id(item.medicine_id)
            if medicine is None:
                raise MedicineNotFoundError(item.medicine_id)
            medicines.append(medicine)

        total_amount = sum(
            (
                medicine.price * item.quantity
                for medicine, item in zip(medicines, items, strict=True)
            ),
            start=Decimal(0),
        )

        sale = Sale(
            customer_id=customer_id, employee_id=employee_id, total_amount=total_amount
        )
        self._sales.add(sale)
        await self._session.flush()  # need sale.sale_id for the item rows below

        for medicine, item in zip(medicines, items, strict=True):
            expected_version = medicine.version
            ok = await self._medicines.decrement_stock_optimistic(
                medicine.medicine_id, item.quantity, expected_version
            )
            if not ok:
                # Distinguish *why* it failed with a fresh read, so the caller
                # (cashier UI) knows whether to retry or tell the customer
                # the item is out of stock - two different situations that
                # both land on "0 rows updated" otherwise.
                fresh = await self._medicines.get_by_id(medicine.medicine_id)
                if fresh is not None and fresh.stock_quantity < item.quantity:
                    raise InsufficientStockError(medicine.medicine_id)
                raise StockVersionConflictError(medicine.medicine_id)
            self._sales.add_item(
                SaleItem(
                    sale_id=sale.sale_id,
                    medicine_id=medicine.medicine_id,
                    quantity=item.quantity,
                    unit_price=medicine.price,
                    medicine_name=medicine.name,
                )
            )

        await self._session.commit()
        return sale

    async def create_from_order(
        self, order: Order, order_items: list[OrderItem], employee_id: int
    ) -> Sale:
        """Converts a completed order into its sale record - called by
        OrderService.update_status, which owns the transaction, so this
        method does not commit (or catch the IntegrityError a losing
        concurrent completion raises - that's update_status's call, since it
        owns the rollback too). Stock was already decremented when the order
        was placed, so this only records the handoff, it doesn't touch stock."""
        existing = await self._sales.get_by_order_id(order.order_id)
        if existing is not None:
            return existing

        sale = Sale(
            order_id=order.order_id,
            customer_id=order.customer_id,
            employee_id=employee_id,
            total_amount=order.total_amount,
        )
        self._sales.add(sale)
        await self._session.flush()
        for item in order_items:
            self._sales.add_item(
                SaleItem(
                    sale_id=sale.sale_id,
                    medicine_id=item.medicine_id,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    medicine_name=item.medicine_name,
                )
            )
        return sale

    async def get(self, sale_id: int) -> Sale:
        sale = await self._sales.get_by_id(sale_id)
        if sale is None:
            raise SaleNotFoundError(sale_id)
        return sale

    async def list_all(self) -> list[Sale]:
        return await self._sales.list_all()

    async def get_items(self, sale_id: int) -> list[SaleItem]:
        return await self._sales.get_items(sale_id)

    async def get_items_for_sales(self, sale_ids: list[int]) -> list[SaleItem]:
        return await self._sales.get_items_for_sales(sale_ids)
