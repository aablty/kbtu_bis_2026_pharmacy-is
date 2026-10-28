from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, status

from src.core.exceptions import (
    EmailAlreadyRegisteredError,
    EmailNotVerifiedError,
    InvalidCredentialsError,
    OtpCooldownError,
    OtpExpiredError,
    OtpInvalidError,
    OtpLockedError,
    UserNotFoundError,
)
from src.core.security import TokenType, create_access_token, decode_token
from src.routers.deps import get_auth_service
from src.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    TokenPair,
    VerifyEmailRequest,
)
from src.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


@router.post(
    "/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED
)
async def register(
    payload: RegisterRequest, auth_service: AuthServiceDep
) -> RegisterResponse:
    try:
        user = await auth_service.register(
            payload.email, payload.password, payload.preferred_locale
        )
    except EmailAlreadyRegisteredError:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Email already registered"
        ) from None
    return RegisterResponse(user_id=user.user_id, email=user.email)


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(
    payload: VerifyEmailRequest, auth_service: AuthServiceDep
) -> MessageResponse:
    try:
        await auth_service.verify_email(payload.email, payload.code)
    except UserNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found") from None
    except OtpExpiredError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Code has expired") from None
    except OtpLockedError:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts"
        ) from None
    except OtpInvalidError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Incorrect code") from None
    return MessageResponse(message="Email verified. You can now log in.")


@router.post("/login", response_model=TokenPair)
async def login(payload: LoginRequest, auth_service: AuthServiceDep) -> TokenPair:
    try:
        return await auth_service.login(payload.email, payload.password)
    except InvalidCredentialsError:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Invalid email or password"
        ) from None
    except EmailNotVerifiedError:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Email not verified") from None


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest) -> TokenPair:
    try:
        decoded = decode_token(payload.refresh_token)
    except jwt.PyJWTError:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Invalid refresh token"
        ) from None
    if decoded.get("type") != TokenType.REFRESH.value:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")

    new_access = create_access_token(int(decoded["sub"]), decoded["role"])
    return TokenPair(access_token=new_access, refresh_token=payload.refresh_token)


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    payload: ForgotPasswordRequest, auth_service: AuthServiceDep
) -> MessageResponse:
    try:
        await auth_service.request_password_reset(payload.email)
    except OtpCooldownError as exc:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, str(exc)) from None
    return MessageResponse(message="If that email exists, a reset code has been sent.")


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    payload: ResetPasswordRequest, auth_service: AuthServiceDep
) -> MessageResponse:
    try:
        await auth_service.reset_password(
            payload.email, payload.code, payload.new_password
        )
    except UserNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found") from None
    except OtpExpiredError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Code has expired") from None
    except OtpLockedError:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts"
        ) from None
    except OtpInvalidError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Incorrect code") from None
    return MessageResponse(message="Password reset. You can now log in.")
