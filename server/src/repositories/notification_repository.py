from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.enums import NotificationType
from src.models.notification import Notification


class NotificationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, notification: Notification) -> None:
        self._session.add(notification)

    async def get_by_id(self, notification_id: int) -> Notification | None:
        return await self._session.get(Notification, notification_id)

    async def list_for_user(
        self, user_id: int, *, unread_only: bool = False
    ) -> list[Notification]:
        stmt = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            stmt = stmt.where(Notification.read_at.is_(None))
        stmt = stmt.order_by(Notification.created_at.desc())
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_user_ids_with_unread(
        self, user_ids: list[int], type_: NotificationType, related_id: int
    ) -> set[int]:
        if not user_ids:
            return set()
        result = await self._session.execute(
            select(Notification.user_id).where(
                Notification.user_id.in_(user_ids),
                Notification.type == type_,
                Notification.related_id == related_id,
                Notification.read_at.is_(None),
            )
        )
        return set(result.scalars().all())
