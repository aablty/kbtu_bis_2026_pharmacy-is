from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.core.exceptions import (
    CategoryNotFoundError,
    CategoryNotLeafError,
    MedicineNotFoundError,
    SupplierNotFoundError,
)
from src.models.enums import UserRole
from src.routers.deps import get_medicine_service, require_role
from src.schemas.catalog import (
    MedicineCreate,
    MedicineListResponse,
    MedicineResponse,
    MedicineUpdate,
)
from src.services.medicine_service import MedicineService

router = APIRouter(prefix="/medicines", tags=["medicines"])

MedicineServiceDep = Annotated[MedicineService, Depends(get_medicine_service)]


@router.get("", response_model=MedicineListResponse)
async def search_medicines(
    service: MedicineServiceDep,
    q: Annotated[
        str | None, Query(description="Match against name or manufacturer")
    ] = None,
    category_id: Annotated[
        int | None, Query(description="Matches this category and its subcategories")
    ] = None,
    requires_prescription: bool | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> MedicineListResponse:
    try:
        items, total = await service.search(
            q=q,
            category_id=category_id,
            requires_prescription=requires_prescription,
            limit=limit,
            offset=offset,
        )
    except CategoryNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found") from None
    return MedicineListResponse(
        items=[MedicineResponse.model_validate(m) for m in items],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{medicine_id}", response_model=MedicineResponse)
async def get_medicine(
    medicine_id: int, service: MedicineServiceDep
) -> MedicineResponse:
    try:
        medicine = await service.get(medicine_id)
    except MedicineNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Medicine not found") from None
    return MedicineResponse.model_validate(medicine)


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
