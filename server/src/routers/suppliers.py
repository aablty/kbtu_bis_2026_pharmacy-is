from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from src.core.exceptions import EntityInUseError, SupplierNotFoundError
from src.models.enums import UserRole
from src.routers.deps import get_supplier_service, require_role
from src.schemas.catalog import SupplierCreate, SupplierResponse, SupplierUpdate
from src.services.supplier_service import SupplierService

router = APIRouter(prefix="/suppliers", tags=["suppliers"])

SupplierServiceDep = Annotated[SupplierService, Depends(get_supplier_service)]


@router.get(
    "",
    response_model=list[SupplierResponse],
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def list_suppliers(service: SupplierServiceDep) -> list[SupplierResponse]:
    suppliers = await service.list_all()
    return [SupplierResponse.model_validate(s) for s in suppliers]


@router.post(
    "",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def create_supplier(
    payload: SupplierCreate, service: SupplierServiceDep
) -> SupplierResponse:
    supplier = await service.create(payload)
    return SupplierResponse.model_validate(supplier)


@router.get(
    "/{supplier_id}",
    response_model=SupplierResponse,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def get_supplier(
    supplier_id: int, service: SupplierServiceDep
) -> SupplierResponse:
    try:
        supplier = await service.get(supplier_id)
    except SupplierNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Supplier not found") from None
    return SupplierResponse.model_validate(supplier)


@router.put(
    "/{supplier_id}",
    response_model=SupplierResponse,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def update_supplier(
    supplier_id: int, payload: SupplierUpdate, service: SupplierServiceDep
) -> SupplierResponse:
    try:
        supplier = await service.update(supplier_id, payload)
    except SupplierNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Supplier not found") from None
    return SupplierResponse.model_validate(supplier)


@router.delete(
    "/{supplier_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def delete_supplier(supplier_id: int, service: SupplierServiceDep) -> None:
    try:
        await service.delete(supplier_id)
    except SupplierNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Supplier not found") from None
    except EntityInUseError:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Supplier still has medicines referencing it"
        ) from None
