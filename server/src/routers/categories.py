from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from src.core.exceptions import (
    CategoryCycleError,
    CategoryNotFoundError,
    CategorySlugConflictError,
    EntityInUseError,
)
from src.models.enums import UserRole
from src.routers.deps import get_category_service, require_role
from src.schemas.catalog import CategoryCreate, CategoryResponse, CategoryUpdate
from src.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["categories"])

CategoryServiceDep = Annotated[CategoryService, Depends(get_category_service)]


@router.get("", response_model=list[CategoryResponse])
async def list_categories(service: CategoryServiceDep) -> list[CategoryResponse]:
    """Public, flat list with parent_id - the client builds the tree."""
    categories = await service.list_all()
    return [CategoryResponse.model_validate(c) for c in categories]


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: int, service: CategoryServiceDep
) -> CategoryResponse:
    try:
        category = await service.get(category_id)
    except CategoryNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found") from None
    return CategoryResponse.model_validate(category)


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def create_category(
    payload: CategoryCreate, service: CategoryServiceDep
) -> CategoryResponse:
    try:
        category = await service.create(payload)
    except CategoryNotFoundError:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Parent category not found"
        ) from None
    except CategorySlugConflictError:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "A category with that name was just created - try again",
        ) from None
    return CategoryResponse.model_validate(category)


@router.put(
    "/{category_id}",
    response_model=CategoryResponse,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def update_category(
    category_id: int, payload: CategoryUpdate, service: CategoryServiceDep
) -> CategoryResponse:
    try:
        category = await service.update(category_id, payload)
    except CategoryNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found") from None
    except CategoryCycleError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Cannot move a category under its own descendant",
        ) from None
    return CategoryResponse.model_validate(category)


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def delete_category(category_id: int, service: CategoryServiceDep) -> None:
    try:
        await service.delete(category_id)
    except CategoryNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found") from None
    except EntityInUseError:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Category still has subcategories or medicines"
        ) from None
