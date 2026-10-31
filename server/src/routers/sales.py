from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from src.core.exceptions import (
    InsufficientStockError,
    InvalidSaleCustomerError,
    MedicineNotFoundError,
    SaleNotFoundError,
    StockVersionConflictError,
    UserNotFoundError,
)
from src.models.enums import UserRole
from src.models.sale import Sale
from src.models.sale_item import SaleItem
from src.routers.deps import CurrentUser, get_sale_service, require_role
from src.schemas.sales import SaleCreate, SaleItemResponse, SaleResponse
from src.services.sale_service import SaleService

router = APIRouter(prefix="/sales", tags=["sales"])

SaleServiceDep = Annotated[SaleService, Depends(get_sale_service)]
_STAFF_ROLES = (UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CASHIER)


def _to_response(sale: Sale, items: list[SaleItem]) -> SaleResponse:
    return SaleResponse(
        sale_id=sale.sale_id,
        order_id=sale.order_id,
        customer_id=sale.customer_id,
        employee_id=sale.employee_id,
        total_amount=sale.total_amount,
        created_at=sale.created_at,
        items=[SaleItemResponse.model_validate(i) for i in items],
    )


@router.post(
    "",
    response_model=SaleResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(*_STAFF_ROLES))],
)
async def process_pos_sale(
    payload: SaleCreate, current_user: CurrentUser, service: SaleServiceDep
) -> SaleResponse:
    try:
        sale = await service.process_pos_sale(
            current_user.user_id, payload.customer_id, payload.items
        )
    except UserNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Customer not found") from None
    except InvalidSaleCustomerError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "customer_id does not belong to a customer account",
        ) from None
    except MedicineNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Medicine not found") from None
    except InsufficientStockError as exc:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Insufficient stock for medicine {exc.medicine_id}",
        ) from None
    except StockVersionConflictError as exc:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Medicine {exc.medicine_id} was updated concurrently - retry the sale",
        ) from None
    items = await service.get_items(sale.sale_id)
    return _to_response(sale, items)


@router.get(
    "",
    response_model=list[SaleResponse],
    dependencies=[Depends(require_role(*_STAFF_ROLES))],
)
async def list_sales(service: SaleServiceDep) -> list[SaleResponse]:
    sales = await service.list_all()
    sale_ids = [s.sale_id for s in sales]
    items_by_sale: dict[int, list[SaleItem]] = {sid: [] for sid in sale_ids}
    for item in await service.get_items_for_sales(sale_ids):
        items_by_sale[item.sale_id].append(item)
    return [_to_response(sale, items_by_sale[sale.sale_id]) for sale in sales]


@router.get(
    "/{sale_id}",
    response_model=SaleResponse,
    dependencies=[Depends(require_role(*_STAFF_ROLES))],
)
async def get_sale(sale_id: int, service: SaleServiceDep) -> SaleResponse:
    try:
        sale = await service.get(sale_id)
    except SaleNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sale not found") from None
    items = await service.get_items(sale_id)
    return _to_response(sale, items)
