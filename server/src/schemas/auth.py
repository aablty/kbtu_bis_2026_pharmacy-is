from pydantic import BaseModel, EmailStr, Field, field_validator

from src.models.enums import Locale, UserRole


class _NormalizesEmail(BaseModel):
    """Lowercases/strips `email` so lookups and the DB unique index are
    effectively case-insensitive without needing a DB-side migration."""

    @field_validator("email", mode="before", check_fields=False)
    @classmethod
    def _normalize_email(cls, v: object) -> object:
        return v.strip().lower() if isinstance(v, str) else v


class RegisterRequest(_NormalizesEmail):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    preferred_locale: Locale = Locale.EN

    @field_validator("full_name", mode="before")
    @classmethod
    def _strip_full_name(cls, v: object) -> object:
        return v.strip() if isinstance(v, str) else v


class RegisterResponse(BaseModel):
    user_id: int
    email: EmailStr
    message: str = "Registration successful. Check your email for a verification code."


class VerifyEmailRequest(_NormalizesEmail):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class LoginRequest(_NormalizesEmail):
    email: EmailStr
    password: str


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(min_length=1)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(_NormalizesEmail):
    email: EmailStr


class ResetPasswordRequest(_NormalizesEmail):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8, max_length=128)


class MessageResponse(BaseModel):
    message: str


class UserProfile(BaseModel):
    user_id: int
    email: EmailStr
    full_name: str | None
    role: UserRole
    preferred_locale: Locale
    is_active: bool

    model_config = {"from_attributes": True}
