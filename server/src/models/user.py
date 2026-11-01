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
    # Nullable - a Google-only account has no password until it sets one via
    # the normal forgot-password flow.
    password_hash: Mapped[str | None] = mapped_column(String(255))
    # Google's stable account id ("sub" claim) - nullable/unique, set once a
    # user signs in with Google (either a brand-new account or linked to an
    # existing email/password one).
    google_id: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
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
