from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import (
    CategoryCycleError,
    CategoryNotFoundError,
    CategorySlugConflictError,
    EntityInUseError,
)
from src.core.slugify import slugify
from src.models.category import Category
from src.repositories.category_repository import CategoryRepository
from src.schemas.catalog import CategoryCreate, CategoryUpdate


class CategoryService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = CategoryRepository(session)

    async def _unique_slug(self, name: str) -> str:
        base = slugify(name)
        slug = base
        suffix = 2
        while await self._repo.slug_exists(slug):
            slug = f"{base}-{suffix}"
            suffix += 1
        return slug

    async def _require_parent_exists(self, parent_id: int | None) -> None:
        if parent_id is not None and await self._repo.get_by_id(parent_id) is None:
            raise CategoryNotFoundError(parent_id)

    async def create(self, data: CategoryCreate) -> Category:
        await self._require_parent_exists(data.parent_id)
        category = Category(
            name=data.name,
            parent_id=data.parent_id,
            slug=await self._unique_slug(data.name),
        )
        self._repo.add(category)
        try:
            await self._session.commit()
        except IntegrityError:
            # The proactive uniqueness loop above can still lose a TOCTOU race
            # against a concurrent create of the same name - same recovery
            # shape as the delete-in-use guards below.
            await self._session.rollback()
            raise CategorySlugConflictError(category.slug) from None
        return category

    async def get(self, category_id: int) -> Category:
        category = await self._repo.get_by_id(category_id)
        if category is None:
            raise CategoryNotFoundError(category_id)
        return category

    async def list_all(self) -> list[Category]:
        return await self._repo.list_all()

    async def get_descendant_ids(self, category_id: int) -> list[int]:
        await self.get(category_id)
        return await self._repo.get_descendant_ids(category_id)

    async def is_leaf(self, category_id: int) -> bool:
        return not await self._repo.has_children(category_id)

    async def update(self, category_id: int, data: CategoryUpdate) -> Category:
        category = await self.get(category_id)
        fields = data.model_dump(exclude_unset=True)

        if "parent_id" in fields:
            new_parent_id = fields["parent_id"]
            await self._require_parent_exists(new_parent_id)
            if new_parent_id is not None and (
                new_parent_id == category_id
                or await self._repo.is_descendant_of(new_parent_id, category_id)
            ):
                raise CategoryCycleError(category_id)
            category.parent_id = new_parent_id

        if "name" in fields:
            category.name = fields["name"]

        await self._session.commit()
        return category

    async def delete(self, category_id: int) -> None:
        category = await self.get(category_id)
        await self._session.delete(category)
        try:
            await self._session.commit()
        except IntegrityError:
            await self._session.rollback()
            raise EntityInUseError(category_id) from None
