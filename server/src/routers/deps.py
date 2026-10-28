from collections.abc import Callable
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.email import EmailSender, get_email_sender
from src.core.security import TokenType, decode_token
from src.models.enums import UserRole
from src.models.user import User
from src.repositories.user_repository import UserRepository
from src.services.auth_service import AuthService
from src.services.otp_service import OtpService

_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_db)]


def get_otp_service(
    session: DbSession, email_sender: Annotated[EmailSender, Depends(get_email_sender)]
) -> OtpService:
    return OtpService(session, email_sender)


def get_auth_service(
    session: DbSession, otp_service: Annotated[OtpService, Depends(get_otp_service)]
) -> AuthService:
    return AuthService(session, otp_service)


async def get_current_user(
    token: Annotated[str | None, Depends(_oauth2_scheme)],
    session: DbSession,
) -> User:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        raise credentials_error

    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        raise credentials_error from None

    if payload.get("type") != TokenType.ACCESS.value:
        raise credentials_error

    user = await UserRepository(session).get_by_id(int(payload["sub"]))
    if user is None or not user.is_active:
        raise credentials_error
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: UserRole) -> Callable[[CurrentUser], User]:
    def checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return user

    return checker
