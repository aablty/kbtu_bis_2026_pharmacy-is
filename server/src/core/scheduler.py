import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from src.core.config import get_settings
from src.core.database import AsyncSessionLocal
from src.core.email import get_email_sender
from src.services.otp_service import OtpService

logger = logging.getLogger("pharmacy.scheduler")
settings = get_settings()


async def cleanup_expired_otps() -> None:
    async with AsyncSessionLocal() as session:
        service = OtpService(session, get_email_sender())
        deleted = await service.cleanup_expired()
        if deleted:
            logger.info("OTP cleanup: removed %d expired/consumed codes", deleted)


def build_scheduler() -> AsyncIOScheduler:
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        cleanup_expired_otps,
        "interval",
        minutes=settings.otp_cleanup_interval_minutes,
        id="otp_cleanup",
    )
    return scheduler
