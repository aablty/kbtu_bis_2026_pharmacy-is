from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    database_url: str = "postgresql+psycopg://pharmacy:pharmacy@localhost:5432/pharmacy"

    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 30
    refresh_token_ttl_days: int = 14

    otp_ttl_minutes: int = 10
    otp_resend_cooldown_seconds: int = 60
    otp_max_attempts: int = 5
    otp_cleanup_interval_minutes: int = 5

    frontend_base_url: str = "http://localhost:5173"

    gemini_api_key: str | None = None
    cloudinary_url: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
