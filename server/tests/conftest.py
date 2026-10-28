import re
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from src.core.windows_event_loop import use_selector_event_loop_on_windows

use_selector_event_loop_on_windows()

from src.core.database import engine, get_db
from src.core.email import EmailSender, get_email_sender
from src.main import app

OTP_CODE_RE = re.compile(r"\b(\d{6})\b")


class RecordingEmailSender(EmailSender):
    def __init__(self) -> None:
        self.sent: list[tuple[str, str, str]] = []

    async def send(self, to: str, subject: str, body: str) -> None:
        self.sent.append((to, subject, body))

    def last_code_for(self, destination: str) -> str:
        for to, _subject, body in reversed(self.sent):
            if to == destination:
                match = OTP_CODE_RE.search(body)
                if match:
                    return match.group(1)
        raise AssertionError(f"No OTP email recorded for {destination}")


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession]:
    """One real transaction against the shared dev database, rolled back after
    the test so nothing persists - safe to run against the Neon dev branch."""
    async with engine.connect() as connection:
        await connection.begin()
        session_factory = async_sessionmaker(
            bind=connection,
            expire_on_commit=False,
            autoflush=False,
            join_transaction_mode="create_savepoint",
        )
        async with session_factory() as session:
            yield session
        await connection.rollback()


@pytest.fixture
def email_sender() -> RecordingEmailSender:
    return RecordingEmailSender()


@pytest_asyncio.fixture
async def client(
    db_session: AsyncSession, email_sender: RecordingEmailSender
) -> AsyncGenerator[AsyncClient]:
    async def _get_db_override() -> AsyncGenerator[AsyncSession]:
        yield db_session

    app.dependency_overrides[get_db] = _get_db_override
    app.dependency_overrides[get_email_sender] = lambda: email_sender

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
