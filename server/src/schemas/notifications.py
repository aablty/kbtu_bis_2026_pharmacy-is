from datetime import datetime

from pydantic import BaseModel

from src.models.enums import NotificationType


class NotificationResponse(BaseModel):
    notification_id: int
    type: NotificationType
    message: str
    related_id: int | None
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
