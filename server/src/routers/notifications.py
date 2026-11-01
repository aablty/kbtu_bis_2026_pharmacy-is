from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from src.core.exceptions import NotificationNotFoundError
from src.routers.deps import CurrentUser, get_notification_service
from src.schemas.notifications import NotificationResponse
from src.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])

NotificationServiceDep = Annotated[
    NotificationService, Depends(get_notification_service)
]


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    current_user: CurrentUser,
    service: NotificationServiceDep,
    unread_only: bool = False,
) -> list[NotificationResponse]:
    notifications = await service.list_for_user(
        current_user.user_id, unread_only=unread_only
    )
    return [NotificationResponse.model_validate(n) for n in notifications]


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: int, current_user: CurrentUser, service: NotificationServiceDep
) -> NotificationResponse:
    try:
        notification = await service.get(notification_id)
    except NotificationNotFoundError:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Notification not found"
        ) from None

    if notification.user_id != current_user.user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your notification")

    notification = await service.mark_read(notification)
    return NotificationResponse.model_validate(notification)
