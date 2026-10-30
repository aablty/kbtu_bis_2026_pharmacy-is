from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status

from src.core.exceptions import (
    IdempotencyKeyConflictError,
    InsufficientStockError,
    InvalidOrderStatusTransitionError,
    MedicineNotFoundError,
    OrderNotFoundError,
)
from src.models.enums import UserRole
from src.models.order import Order
from src.models.order_item import OrderItem
from src.models.payment import Payment
from src.routers.deps import CurrentUser, get_order_service, require_role
from src.schemas.orders import (
    OrderCreate,
    OrderItemResponse,
    OrderResponse,
    OrderStatusUpdateRequest,
    PaymentResponse,
)
from src.services.order_service import OrderService

router = APIRouter(prefix="/orders", tags=["orders"])

OrderServiceDep = Annotated[OrderService, Depends(get_order_service)]
_STAFF_ROLES = (UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CASHIER)


def _to_response(
    order: Order, items: list[OrderItem], payment: Payment | None
) -> OrderResponse:
    return OrderResponse(
        order_id=order.order_id,
        customer_id=order.customer_id,
        status=order.status,
        fulfillment_type=order.fulfillment_type,
        delivery_address=order.delivery_address,
        total_amount=order.total_amount,
        created_at=order.created_at,
        items=[OrderItemResponse.model_validate(i) for i in items],
        payment=PaymentResponse.model_validate(payment) if payment else None,
    )


@router.post(
    "",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.CUSTOMER))],
)
async def place_order(
    payload: OrderCreate,
    current_user: CurrentUser,
    service: OrderServiceDep,
    idempotency_key: Annotated[
        str | None, Header(alias="Idempotency-Key", max_length=100)
    ] = None,
) -> OrderResponse:
    try:
        order = await service.place_order(
            current_user.user_id, payload, idempotency_key
        )
    except MedicineNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Medicine not found") from None
    except InsufficientStockError as exc:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Insufficient stock for medicine {exc.medicine_id}",
        ) from None
    except IdempotencyKeyConflictError:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Idempotency key already used for a different order",
        ) from None
    items = await service.get_items(order.order_id)
    payment = await service.get_payment(order.order_id)
    return _to_response(order, items, payment)


@router.get("", response_model=list[OrderResponse])
async def list_orders(
    current_user: CurrentUser, service: OrderServiceDep
) -> list[OrderResponse]:
    """Customers see only their own orders; staff see every order - they
    need the full queue to process fulfillment."""
    orders = (
        await service.list_all()
        if current_user.role in _STAFF_ROLES
        else await service.list_for_customer(current_user.user_id)
    )
    order_ids = [o.order_id for o in orders]
    items_by_order: dict[int, list[OrderItem]] = {oid: [] for oid in order_ids}
    for item in await service.get_items_for_orders(order_ids):
        items_by_order[item.order_id].append(item)
    payment_by_order = {
        p.order_id: p for p in await service.get_payments_for_orders(order_ids)
    }

    return [
        _to_response(
            order, items_by_order[order.order_id], payment_by_order.get(order.order_id)
        )
        for order in orders
    ]


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int, current_user: CurrentUser, service: OrderServiceDep
) -> OrderResponse:
    try:
        order = await service.get(order_id)
    except OrderNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found") from None

    is_owner = order.customer_id == current_user.user_id
    if not is_owner and current_user.role not in _STAFF_ROLES:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order")

    items = await service.get_items(order_id)
    payment = await service.get_payment(order_id)
    return _to_response(order, items, payment)


@router.patch(
    "/{order_id}/status",
    response_model=OrderResponse,
    dependencies=[Depends(require_role(*_STAFF_ROLES))],
)
async def update_order_status(
    order_id: int,
    payload: OrderStatusUpdateRequest,
    current_user: CurrentUser,
    service: OrderServiceDep,
) -> OrderResponse:
    try:
        order = await service.update_status(
            order_id, payload.status, current_user.user_id
        )
    except OrderNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found") from None
    except InvalidOrderStatusTransitionError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Cannot move an order from {exc.from_status} to {exc.to_status}",
        ) from None
    items = await service.get_items(order_id)
    payment = await service.get_payment(order_id)
    return _to_response(order, items, payment)
