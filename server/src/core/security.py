import secrets
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any

import bcrypt
import jwt

from src.core.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


class TokenType(StrEnum):
    ACCESS = "access"
    REFRESH = "refresh"


def _create_token(
    subject: str, role: str, token_type: TokenType, ttl: timedelta
) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "role": role,
        "type": token_type.value,
        "iat": now,
        "exp": now + ttl,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: int, role: str) -> str:
    return _create_token(
        str(user_id),
        role,
        TokenType.ACCESS,
        timedelta(minutes=settings.access_token_ttl_minutes),
    )


def create_refresh_token(user_id: int, role: str) -> str:
    return _create_token(
        str(user_id),
        role,
        TokenType.REFRESH,
        timedelta(days=settings.refresh_token_ttl_days),
    )


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])


def generate_otp_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp_code(code: str) -> str:
    return bcrypt.hashpw(code.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_otp_code(code: str, code_hash: str) -> bool:
    return bcrypt.checkpw(code.encode("utf-8"), code_hash.encode("utf-8"))
