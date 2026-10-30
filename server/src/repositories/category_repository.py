from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from src.models.category import Category


class CategoryRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, category: Category) -> None:
        self._session.add(category)

    async def get_by_id(self, category_id: int) -> Category | None:
        return await self._session.get(Category, category_id)

    async def get_by_slug(self, slug: str) -> Category | None:
        result = await self._session.execute(
            select(Category).where(Category.slug == slug)
        )
        return result.scalar_one_or_none()

    async def slug_exists(self, slug: str) -> bool:
        return await self.get_by_slug(slug) is not None

    async def list_all(self) -> list[Category]:
        result = await self._session.execute(select(Category).order_by(Category.name))
        return list(result.scalars().all())

    async def has_children(self, category_id: int) -> bool:
        result = await self._session.execute(
            select(Category.category_id)
            .where(Category.parent_id == category_id)
            .limit(1)
        )
        return result.first() is not None

    async def get_descendant_ids(
        self, category_id: int, *, include_self: bool = True
    ) -> list[int]:
        """IDs of category_id and every descendant, via a recursive CTE walking
        parent_id downward. Reused by catalog search (category + subcategories)
        and the future AI assistant's lookup tool - one code path, not two."""
        root = select(Category.category_id).where(Category.category_id == category_id)
        tree = root.cte(name="category_tree", recursive=True)
        children = aliased(Category)
        tree = tree.union_all(
            select(children.category_id).where(children.parent_id == tree.c.category_id)
        )
        result = await self._session.execute(select(tree.c.category_id))
        ids = [row[0] for row in result.all()]
        if not include_self:
            ids = [cid for cid in ids if cid != category_id]
        return ids

    async def is_descendant_of(self, candidate_id: int, ancestor_id: int) -> bool:
        """True if candidate_id is ancestor_id itself or lies beneath it -
        used to reject a move that would turn a category into its own ancestor."""
        return candidate_id in await self.get_descendant_ids(ancestor_id)
