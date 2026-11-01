import asyncio
from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import (
    EmailAlreadyRegisteredError,
    EmailNotVerifiedError,
    InvalidCredentialsError,
    UserNotFoundError,
)
from src.core.google_oauth import verify_google_id_token
from src.core.security import (
    DUMMY_PASSWORD_HASH,
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
        # Always run bcrypt, even for an unregistered email or a Google-only
        # account with no password of its own, against a fixed dummy hash -
        # keeps response timing the same for "no such user", "wrong
        # password", and "this account has no password" so none of the
        # three is distinguishable from the outside.
        password_hash = (
            user.password_hash
            if user is not None and user.password_hash is not None
            else DUMMY_PASSWORD_HASH
        )
        password_ok = verify_password(password, password_hash)
        if user is None or not password_ok:
            raise InvalidCredentialsError(email)
        if user.email_verified_at is None:
            raise EmailNotVerifiedError(email)

        return self._issue_tokens(user)

    async def login_with_google(self, id_token: str) -> TokenPair:
        identity = await asyncio.to_thread(verify_google_id_token, id_token)
        # Same normalization every other email entry point uses - Google's
        # claim is usually already lowercase, but isn't guaranteed to be,
        # and the DB's unique index on email is case-sensitive.
        email = identity.email.strip().lower()

        user = await self._users.get_by_google_id(identity.sub)
        if user is None:
            # Not seen this Google account before - link it to an existing
            # email/password account instead of creating a duplicate, if
            # one already uses the same (Google-verified) email.
            user = await self._users.get_by_email(email)
            if user is None:
                user = User(
                    email=email,
                    password_hash=None,
                    google_id=identity.sub,
                    role=UserRole.CUSTOMER,
                    email_verified_at=datetime.now(UTC),
                )
                self._users.add(user)
            else:
                user.google_id = identity.sub
                if user.email_verified_at is None:
                    user.email_verified_at = datetime.now(UTC)
            try:
                await self._session.commit()
            except IntegrityError:
                # Two concurrent Google logins for the same account (double
                # click, retry-on-timeout) can both pass the check above
                # before either commits - google_id's unique constraint
                # catches the loser here. Same recovery shape as
                # OrderService's idempotency-key race: roll back and return
                # the winner's tokens instead of a 500.
                await self._session.rollback()
                winner = await self._users.get_by_google_id(identity.sub)
                if winner is not None:
                    return self._issue_tokens(winner)
                raise

        return self._issue_tokens(user)

    def _issue_tokens(self, user: User) -> TokenPair:
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
