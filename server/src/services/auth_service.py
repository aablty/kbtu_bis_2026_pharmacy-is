from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import (
    EmailAlreadyRegisteredError,
    EmailNotVerifiedError,
    InvalidCredentialsError,
    UserNotFoundError,
)
from src.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from src.models.enums import Locale, OtpPurpose, UserRole
from src.models.user import User
from src.repositories.user_repository import UserRepository
from src.schemas.auth import TokenPair
from src.services.otp_service import OtpService


class AuthService:
    def __init__(self, session: AsyncSession, otp_service: OtpService) -> None:
        self._session = session
        self._users = UserRepository(session)
        self._otp = otp_service

    async def register(
        self, email: str, password: str, preferred_locale: Locale
    ) -> User:
        if await self._users.get_by_email(email) is not None:
            raise EmailAlreadyRegisteredError(email)

        user = User(
            email=email,
            password_hash=hash_password(password),
            role=UserRole.CUSTOMER,
            preferred_locale=preferred_locale,
        )
        self._users.add(user)
        await self._session.flush()

        await self._otp.issue(
            OtpPurpose.EMAIL_VERIFICATION, email, user_id=user.user_id
        )
        await self._session.commit()
        return user

    async def verify_email(self, email: str, code: str) -> User:
        user = await self._users.get_by_email(email)
        if user is None:
            raise UserNotFoundError(email)

        await self._otp.verify(OtpPurpose.EMAIL_VERIFICATION, email, code)
        user.email_verified_at = datetime.now(UTC)
        await self._session.commit()
        return user

    async def login(self, email: str, password: str) -> TokenPair:
        user = await self._users.get_by_email(email)
        if user is None or not verify_password(password, user.password_hash):
            raise InvalidCredentialsError(email)
        if user.email_verified_at is None:
            raise EmailNotVerifiedError(email)

        return TokenPair(
            access_token=create_access_token(user.user_id, user.role.value),
            refresh_token=create_refresh_token(user.user_id, user.role.value),
        )

    async def request_password_reset(self, email: str) -> None:
        user = await self._users.get_by_email(email)
        if user is None:
            # Don't reveal whether the email exists - still returns 202-style success upstream.
            return
        await self._otp.issue(OtpPurpose.PASSWORD_RESET, email, user_id=user.user_id)
        await self._session.commit()

    async def reset_password(self, email: str, code: str, new_password: str) -> None:
        user = await self._users.get_by_email(email)
        if user is None:
            raise UserNotFoundError(email)

        await self._otp.verify(OtpPurpose.PASSWORD_RESET, email, code)
        user.password_hash = hash_password(new_password)
        await self._session.commit()
