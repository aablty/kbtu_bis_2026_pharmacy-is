from pydantic import BaseModel, EmailStr, Field

from src.models.enums import Locale, UserRole


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    preferred_locale: Locale = Locale.EN


class RegisterResponse(BaseModel):
    user_id: int
    email: EmailStr
    message: str = "Registration successful. Check your email for a verification code."


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8, max_length=128)


class MessageResponse(BaseModel):
    message: str


class UserProfile(BaseModel):
    user_id: int
    email: EmailStr
    role: UserRole
    preferred_locale: Locale
    is_active: bool

    model_config = {"from_attributes": True}
