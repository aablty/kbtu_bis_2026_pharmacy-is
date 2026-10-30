from sqlalchemy.ext.asyncio import async_sessionmaker

from src.core.database import engine
from src.core.exceptions import OtpInvalidError
from src.core.security import hash_password
from src.core.windows_event_loop import use_selector_event_loop_on_windows
from src.models.enums import OtpPurpose, UserRole
from src.models.user import User
from src.repositories.otp_repository import OtpRepository
from src.repositories.user_repository import UserRepository
from src.services.otp_service import OtpService
from tests.conftest import RecordingEmailSender

use_selector_event_loop_on_windows()


async def test_failed_attempt_survives_the_issuing_session_closing() -> None:
    """Regression test: OtpService.verify() must commit the attempt-count
    increment itself, because the caller never gets a chance to - it raises
    right after. A plain flush() would be silently rolled back once the
    request-scoped session that made the call closes, resetting the lockout
    counter on every request and defeating the max-attempts limit entirely."""
    async with engine.connect() as connection:
        await connection.begin()
        session_factory = async_sessionmaker(
            bind=connection,
            expire_on_commit=False,
            autoflush=False,
            join_transaction_mode="create_savepoint",
        )
        try:
            destination = "otp-regression@example.com"

            # "Request 1": issue a code, then fail to verify it with a wrong guess.
            async with session_factory() as session_one:
                user = User(
                    email=destination,
                    password_hash=hash_password("irrelevant-password-1"),
                    role=UserRole.CUSTOMER,
                )
                UserRepository(session_one).add(user)
                await session_one.flush()

                service_one = OtpService(session_one, RecordingEmailSender())
                await service_one.issue(
                    OtpPurpose.EMAIL_VERIFICATION, destination, user_id=user.user_id
                )
                try:
                    await service_one.verify(
                        OtpPurpose.EMAIL_VERIFICATION, destination, "000000"
                    )
                    raise AssertionError("expected OtpInvalidError")
                except OtpInvalidError:
                    pass
            # Session closes here, exactly as FastAPI's get_db() does at the end
            # of a request - any uncommitted work would be rolled back now.

            # "Request 2": a fresh session must still see the failed attempt.
            async with session_factory() as session_two:
                otp = await OtpRepository(session_two).get_latest_active(
                    OtpPurpose.EMAIL_VERIFICATION, destination
                )
                assert otp is not None
                assert otp.attempt_count == 1
        finally:
            await connection.rollback()
