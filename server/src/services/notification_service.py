from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import NotificationNotFoundError
from src.models.enums import NotificationType, UserRole
from src.models.medicine import Medicine
from src.models.notification import Notification
from src.models.user import User
from src.repositories.notification_repository import NotificationRepository
from src.repositories.user_repository import UserRepository

_STAFF_ROLES = (UserRole.ADMIN, UserRole.PHARMACIST)


class NotificationService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._notifications = NotificationRepository(session)
        self._users = UserRepository(session)
        # Cached for this instance's lifetime - one per request via DI, so
        # this avoids re-querying staff once per low-stock item in a
        # multi-item order/sale instead of once per request.
        self._staff_cache: list[User] | None = None

    async def _staff(self) -> list[User]:
        if self._staff_cache is None:
            self._staff_cache = await self._users.list_active_by_roles(*_STAFF_ROLES)
        return self._staff_cache

    def notify_user(
        self,
        user_id: int,
        type_: NotificationType,
        message: str,
        *,
        related_id: int | None = None,
        message_key: str | None = None,
        message_params: dict | None = None,
    ) -> None:
        """Queues a notification on the caller's own session/transaction -
        does not flush or commit, since this is always called from inside
        another service method that owns the transaction (OrderService,
        SaleService, PrescriptionService)."""
        self._notifications.add(
            Notification(
                user_id=user_id,
                type=type_,
                message=message,
                related_id=related_id,
                message_key=message_key,
                message_params=message_params,
            )
        )

    async def notify_staff_low_stock(self, medicine: Medicine) -> None:
        """Checks the medicine's *current* in-memory stock_quantity - callers
        pass the same ORM object they just decremented stock on, which
        SQLAlchemy auto-refreshes after a matching Core-style UPDATE in the
        same session, so no extra query is needed to see the fresh value.

        Skips any staff member who already has an unread low_stock
        notification for this same medicine - otherwise every order/sale
        that leaves a medicine under threshold would queue another row,
        flooding the feed. Flushes first so an earlier, not-yet-committed
        call in this same request (e.g. two line items for the same
        medicine in one order) is guaranteed visible to the dedup query
        below, regardless of the session's autoflush setting.
        """
        if medicine.stock_quantity > medicine.reorder_threshold:
            return

        staff = await self._staff()
        if not staff:
            return

        await self._session.flush()
        already_notified = await self._notifications.list_user_ids_with_unread(
            [user.user_id for user in staff],
            NotificationType.LOW_STOCK,
            medicine.medicine_id,
        )
        recipients = [user for user in staff if user.user_id not in already_notified]
        if not recipients:
            return

        message = (
            f"Low stock: {medicine.name} has {medicine.stock_quantity} left "
            f"(reorder threshold {medicine.reorder_threshold})."
        )
        for user in recipients:
            self.notify_user(
                user.user_id,
                NotificationType.LOW_STOCK,
                message,
                related_id=medicine.medicine_id,
                message_key="low_stock",
                message_params={
                    "name": medicine.name,
                    "stock": medicine.stock_quantity,
                    "threshold": medicine.reorder_threshold,
                },
            )

    async def get(self, notification_id: int) -> Notification:
        notification = await self._notifications.get_by_id(notification_id)
        if notification is None:
            raise NotificationNotFoundError(notification_id)
        return notification

    async def list_for_user(
        self, user_id: int, *, unread_only: bool = False
    ) -> list[Notification]:
        return await self._notifications.list_for_user(user_id, unread_only=unread_only)

    async def mark_read(self, notification: Notification) -> Notification:
        notification.read_at = datetime.now(UTC)
        await self._session.commit()
        return notification
