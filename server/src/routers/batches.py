from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from src.core.exceptions import (
    BatchNotFoundError,
    MedicineNotFoundError,
    SupplierNotFoundError,
)
from src.models.enums import UserRole
from src.routers.deps import get_batch_service, require_role
from src.schemas.batches import BatchByBarcodeResponse, BatchCreate, BatchResponse
from src.services.batch_service import BatchService

router = APIRouter(prefix="/batches", tags=["batches"])

BatchServiceDep = Annotated[BatchService, Depends(get_batch_service)]
_SALE_ROLES = (UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CASHIER)


@router.post(
    "",
    response_model=BatchResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.ADMIN, UserRole.PHARMACIST))],
)
async def receive_stock(
    payload: BatchCreate, service: BatchServiceDep
) -> BatchResponse:
    try:
        batch = await service.receive_stock(
            payload.medicine_id,
            payload.supplier_id,
            payload.quantity,
            payload.expiry_date,
        )
    except MedicineNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Medicine not found") from None
    except SupplierNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Supplier not found") from None
    return BatchResponse.model_validate(batch)


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
