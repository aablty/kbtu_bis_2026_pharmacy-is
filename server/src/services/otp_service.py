from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.email import EmailSender
from src.core.exceptions import (
    OtpCooldownError,
    OtpExpiredError,
    OtpInvalidError,
    OtpLockedError,
)
from src.core.security import generate_otp_code, hash_otp_code, verify_otp_code
from src.models.enums import OtpPurpose
from src.models.otp import OtpCode
from src.repositories.otp_repository import OtpRepository

settings = get_settings()

_SUBJECTS = {
    OtpPurpose.EMAIL_VERIFICATION: "Verify your email",
    OtpPurpose.PASSWORD_RESET: "Reset your password",
    OtpPurpose.ORDER_PICKUP: "Your order pickup code",
}


class OtpService:
    """Issues and verifies one-time codes. One mechanism, reused by every purpose
    (email verification, password reset, and - once ORDERS exists - order pickup)."""

    def __init__(self, session: AsyncSession, email_sender: EmailSender) -> None:
        self._session = session
        self._repo = OtpRepository(session)
        self._email_sender = email_sender

    async def issue(
        self,
        purpose: OtpPurpose,
        destination: str,
        *,
        user_id: int | None = None,
        order_id: int | None = None,
    ) -> OtpCode:
        existing = await self._repo.get_latest_active(purpose, destination)
        now = datetime.now(UTC)
        if existing is not None:
            cooldown_until = existing.created_at + timedelta(
                seconds=settings.otp_resend_cooldown_seconds
            )
            if cooldown_until > now:
                raise OtpCooldownError(int((cooldown_until - now).total_seconds()))

        code = generate_otp_code()
        otp = OtpCode(
            purpose=purpose,
            user_id=user_id,
            order_id=order_id,
            destination=destination,
            code_hash=hash_otp_code(code),
            expires_at=now + timedelta(minutes=settings.otp_ttl_minutes),
            max_attempts=settings.otp_max_attempts,
        )
        self._repo.add(otp)
        await self._session.flush()

        await self._email_sender.send(
            to=destination,
            subject=_SUBJECTS[purpose],
            body=f"Your verification code is {code}. It expires in {settings.otp_ttl_minutes} minutes.",
        )
        return otp

    async def verify(self, purpose: OtpPurpose, destination: str, code: str) -> OtpCode:
        otp = await self._repo.get_latest_active(purpose, destination)
        if otp is None:
            raise OtpInvalidError("No active code for this destination")

        now = datetime.now(UTC)
        if otp.expires_at < now:
            raise OtpExpiredError("Code has expired")
        if otp.attempt_count >= otp.max_attempts:
            raise OtpLockedError("Too many failed attempts, request a new code")

        if not verify_otp_code(code, otp.code_hash):
            otp.attempt_count += 1
            await self._session.flush()
            raise OtpInvalidError("Incorrect code")

        otp.consumed_at = now
        await self._session.flush()
        return otp

    async def cleanup_expired(self) -> int:
        deleted = await self._repo.delete_expired_or_consumed()
        await self._session.commit()
        return deleted
