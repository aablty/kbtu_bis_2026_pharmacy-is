from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.core.cursor import decode_cursor, encode_cursor
from src.core.exceptions import (
    CategoryNotFoundError,
    CategoryNotLeafError,
    MedicineNotFoundError,
    SupplierNotFoundError,
)
from src.models.enums import UserRole
from src.routers.deps import get_batch_service, get_medicine_service, require_role
from src.schemas.catalog import (
    MedicineCreate,
    MedicineListResponse,
    MedicineResponse,
    MedicineUpdate,
)
from src.services.batch_service import BatchService
from src.services.medicine_service import MedicineService

router = APIRouter(prefix="/medicines", tags=["medicines"])

MedicineServiceDep = Annotated[MedicineService, Depends(get_medicine_service)]
BatchServiceDep = Annotated[BatchService, Depends(get_batch_service)]


def _with_batch_expiry(
    response: MedicineResponse, expiry: date | None
) -> MedicineResponse:
    # Nearest in-stock batch's expiry wins over the static MEDICINES.expiry_date
    # column, which predates batches and is never updated as stock turns over.
    # No in-stock batch (none received yet, or none left) - fall back to the
    # static column so it still shows something for not-yet-migrated data.
    if expiry is not None:
        return response.model_copy(update={"expiry_date": expiry})
    return response


@router.get("", response_model=MedicineListResponse)
async def search_medicines(
    service: MedicineServiceDep,
    batch_service: BatchServiceDep,
    q: Annotated[
        str | None, Query(description="Match against name or manufacturer")
    ] = None,
    category_id: Annotated[
        int | None, Query(description="Matches this category and its subcategories")
    ] = None,
    requires_prescription: bool | None = None,
    in_stock: bool = False,
    min_price: Annotated[Decimal | None, Query(ge=0)] = None,
    max_price: Annotated[Decimal | None, Query(ge=0)] = None,
    sort: Literal["name", "price_asc", "price_desc"] = "name",
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    cursor: Annotated[
        str | None,
        Query(description="next_cursor from the previous page; replaces offset"),
    ] = None,
) -> MedicineListResponse:
    try:
        after = decode_cursor(cursor) if cursor else None
        if after and sort.startswith("price"):
            Decimal(after[0])
    except ValueError, InvalidOperation:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "Invalid cursor"
        ) from None
    try:
        items, total, has_more = await service.search(
            q=q,
            category_id=category_id,
            requires_prescription=requires_prescription,
            in_stock=in_stock,
            min_price=min_price,
            max_price=max_price,
            limit=limit,
            offset=offset,
            after=after,
            sort=sort,
        )
    except CategoryNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found") from None
    expiry_by_id = await batch_service.get_earliest_expiry_bulk(
        [m.medicine_id for m in items]
    )
    return MedicineListResponse(
        items=[
            _with_batch_expiry(
                MedicineResponse.model_validate(m), expiry_by_id.get(m.medicine_id)
            )
            for m in items
        ],
        total=total,
        limit=limit,
        offset=offset,
        next_cursor=(
            encode_cursor(
                items[-1].name if sort == "name" else str(items[-1].price),
                items[-1].medicine_id,
            )
            if has_more
            else None
        ),
    )


@router.get("/{medicine_id}", response_model=MedicineResponse)
async def get_medicine(
    medicine_id: int, service: MedicineServiceDep, batch_service: BatchServiceDep
) -> MedicineResponse:
    try:
        medicine = await service.get(medicine_id)
    except MedicineNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Medicine not found") from None
    expiry_by_id = await batch_service.get_earliest_expiry_bulk([medicine_id])
    return _with_batch_expiry(
        MedicineResponse.model_validate(medicine), expiry_by_id.get(medicine_id)
    )


@router.post(
    "",
    response_model=MedicineResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def create_medicine(
    payload: MedicineCreate, service: MedicineServiceDep
) -> MedicineResponse:
    try:
        medicine = await service.create(payload)
    except CategoryNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found") from None
    except SupplierNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Supplier not found") from None
    except CategoryNotLeafError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Category has subcategories - medicines must be filed under a leaf category",
        ) from None
    return MedicineResponse.model_validate(medicine)


@router.put(
    "/{medicine_id}",
    response_model=MedicineResponse,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def update_medicine(
    medicine_id: int, payload: MedicineUpdate, service: MedicineServiceDep
) -> MedicineResponse:
    try:
        medicine = await service.update(medicine_id, payload)
    except MedicineNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Medicine not found") from None
    except CategoryNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found") from None
    except SupplierNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Supplier not found") from None
    except CategoryNotLeafError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Category has subcategories - medicines must be filed under a leaf category",
        ) from None
    return MedicineResponse.model_validate(medicine)


@router.delete(
    "/{medicine_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def delete_medicine(medicine_id: int, service: MedicineServiceDep) -> None:
    try:
        await service.delete(medicine_id)
    except MedicineNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Medicine not found") from None
