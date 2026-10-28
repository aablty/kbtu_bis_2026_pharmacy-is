from datetime import datetime

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from src.core.database import Base
from src.models.enums import Locale, UserRole


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole, name="user_role", values_callable=lambda e: [m.value for m in e]
        ),
        nullable=False,
    )
    preferred_locale: Mapped[Locale] = mapped_column(
        Enum(Locale, name="locale", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=Locale.EN,
    )
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
