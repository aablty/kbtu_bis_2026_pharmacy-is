from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.core.exceptions import (
    BatchNotFoundError,
    MedicineNotFoundError,
    SupplierNotFoundError,
    WriteOffExceedsRemainingError,
)
from src.models.enums import UserRole
from src.models.stock_batch import StockBatch
from src.routers.deps import CurrentUser, get_batch_service, require_role
from src.schemas.batches import (
    BatchByBarcodeResponse,
    BatchCreate,
    BatchResponse,
    BatchWriteOffCreate,
    BatchWriteOffResponse,
)
from src.services.batch_service import BatchService

router = APIRouter(prefix="/batches", tags=["batches"])

BatchServiceDep = Annotated[BatchService, Depends(get_batch_service)]
_SALE_ROLES = (UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CASHIER)


def _to_batch_response(
    batch: StockBatch, received_by_name: str | None
) -> BatchResponse:
    return BatchResponse(
        batch_id=batch.batch_id,
        medicine_id=batch.medicine_id,
        supplier_id=batch.supplier_id,
        quantity_received=batch.quantity_received,
        quantity_remaining=batch.quantity_remaining,
        expiry_date=batch.expiry_date,
        barcode=batch.barcode,
        received_at=batch.received_at,
        received_by=batch.received_by,
        received_by_name=received_by_name,
    )


@router.post(
    "",
    response_model=BatchResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.ADMIN, UserRole.PHARMACIST))],
)
async def receive_stock(
    payload: BatchCreate, current_user: CurrentUser, service: BatchServiceDep
) -> BatchResponse:
    try:
        batch = await service.receive_stock(
            payload.medicine_id,
            payload.supplier_id,
            payload.quantity,
            payload.expiry_date,
            current_user.user_id,
        )
    except MedicineNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Medicine not found") from None
    except SupplierNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Supplier not found") from None
    return _to_batch_response(batch, current_user.full_name or current_user.email)


@router.get(
    "/receiving-activity",
    response_model=list[BatchResponse],
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def list_receiving_activity(
    service: BatchServiceDep,
    received_by: int | None = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[BatchResponse]:
    rows = await service.list_recent(received_by, limit)
    return [_to_batch_response(batch, name) for batch, name in rows]


@router.post(
    "/{batch_id}/write-off",
    response_model=BatchWriteOffResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.ADMIN, UserRole.PHARMACIST))],
)
async def write_off_batch(
    batch_id: int,
    payload: BatchWriteOffCreate,
    current_user: CurrentUser,
    service: BatchServiceDep,
) -> BatchWriteOffResponse:
    try:
        write_off = await service.write_off(
            batch_id, payload.quantity, payload.reason, current_user.user_id
        )
    except BatchNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found") from None
    except WriteOffExceedsRemainingError as exc:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot write off {exc.quantity} - only {exc.remaining} remaining",
        ) from None
    return BatchWriteOffResponse.model_validate(write_off)


@router.get(
    "/by-barcode/{barcode}",
    response_model=BatchByBarcodeResponse,
    dependencies=[Depends(require_role(*_SALE_ROLES))],
)
async def get_by_barcode(
    barcode: str, service: BatchServiceDep
) -> BatchByBarcodeResponse:
    try:
        batch = await service.get_by_barcode(barcode)
        medicine_name = await service.get_medicine_name(batch.medicine_id)
    except BatchNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found") from None
    return BatchByBarcodeResponse(
        batch_id=batch.batch_id,
        medicine_id=batch.medicine_id,
        medicine_name=medicine_name,
        quantity_remaining=batch.quantity_remaining,
        expiry_date=batch.expiry_date,
        barcode=batch.barcode,
    )
