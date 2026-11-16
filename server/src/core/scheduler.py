import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from src.core.config import get_settings
from src.core.database import AsyncSessionLocal
from src.core.email import get_email_sender
from src.services.notification_service import NotificationService
from src.services.otp_service import OtpService

logger = logging.getLogger("pharmacy.scheduler")
settings = get_settings()


async def cleanup_expired_otps() -> None:
    async with AsyncSessionLocal() as session:
        service = OtpService(session, get_email_sender())
        deleted = await service.cleanup_expired()
        if deleted:
            logger.info("OTP cleanup: removed %d expired/consumed codes", deleted)


async def check_batches_expiring_soon() -> None:
    async with AsyncSessionLocal() as session:
        service = NotificationService(session)
        await service.notify_staff_batches_expiring_soon()
        await session.commit()


def build_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        cleanup_expired_otps,
        "interval",
        minutes=settings.otp_cleanup_interval_minutes,
        id="otp_cleanup",
    )
    scheduler.add_job(
        check_batches_expiring_soon,
        "interval",
        hours=24,
        id="batch_expiry_check",
    )
    return scheduler
