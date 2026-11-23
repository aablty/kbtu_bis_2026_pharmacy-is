from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.enums import UserRole
from src.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: int) -> User | None:
        return await self._session.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        result = await self._session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_ids(self, user_ids: list[int]) -> list[User]:
        if not user_ids:
            return []
        result = await self._session.execute(
            select(User).where(User.user_id.in_(user_ids))
        )
        return list(result.scalars().all())

    async def get_by_google_id(self, google_id: str) -> User | None:
        result = await self._session.execute(
            select(User).where(User.google_id == google_id)
        )
        return result.scalar_one_or_none()

    def add(self, user: User) -> None:
        self._session.add(user)

    async def list_active_by_roles(self, *roles: UserRole) -> list[User]:
        result = await self._session.execute(
            select(User).where(User.role.in_(roles), User.is_active)
        )
        return list(result.scalars().all())

    async def search_by_name_or_email(self, query: str, limit: int) -> list[User]:
        pattern = f"%{query}%"
        result = await self._session.execute(
            select(User)
            .where(
                User.is_active,
                User.role == UserRole.CUSTOMER,
                or_(
                    User.full_name.ilike(pattern),
                    User.email.ilike(pattern),
                ),
            )
            .order_by(User.full_name, User.email)
            .limit(limit)
        )
        return list(result.scalars().all())
