import uuid
from collections.abc import Callable
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker

from src.core.database import engine
from src.core.exceptions import GoogleTokenInvalidError
from src.core.google_oauth import GoogleIdentity
from src.core.security import decode_token
from src.core.windows_event_loop import use_selector_event_loop_on_windows
from src.models.enums import UserRole
from src.models.user import User
from src.repositories.user_repository import UserRepository
from src.services.auth_service import AuthService
from src.services.otp_service import OtpService
from tests.conftest import RecordingEmailSender

use_selector_event_loop_on_windows()


def unique_email() -> str:
    return f"google-test-{uuid.uuid4().hex[:12]}@example.com"


def _fake_verify(identity: GoogleIdentity) -> Callable[[str], GoogleIdentity]:
    def _verify(token: str) -> GoogleIdentity:
        return identity

    return _verify


def _fake_verify_raises() -> Callable[[str], GoogleIdentity]:
    def _verify(token: str) -> GoogleIdentity:
        raise GoogleTokenInvalidError("Google account email is not verified")

    return _verify


async def test_google_login_creates_new_customer_account(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    email = unique_email()
    monkeypatch.setattr(
        "src.services.auth_service.verify_google_id_token",
        _fake_verify(GoogleIdentity(sub="google-sub-new", email=email)),
    )

    resp = await client.post("/auth/google", json={"id_token": "whatever"})
    assert resp.status_code == 200, resp.text
    tokens = resp.json()
    assert tokens["access_token"]

    resp = await client.get(
        "/users/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == email
    assert resp.json()["role"] == "customer"


async def test_google_login_links_existing_email_password_account(
    client: AsyncClient,
    email_sender: RecordingEmailSender,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    email = unique_email()
    resp = await client.post(
        "/auth/register", json={"email": email, "password": "correct-horse-1"}
    )
    assert resp.status_code == 201
    code = email_sender.last_code_for(email)
    resp = await client.post("/auth/verify-email", json={"email": email, "code": code})
    assert resp.status_code == 200

    resp = await client.post(
        "/auth/login", json={"email": email, "password": "correct-horse-1"}
    )
    assert resp.status_code == 200
    password_access_token = resp.json()["access_token"]
    resp = await client.get(
        "/users/me", headers={"Authorization": f"Bearer {password_access_token}"}
    )
    password_user_id = resp.json()["user_id"]

    monkeypatch.setattr(
        "src.services.auth_service.verify_google_id_token",
        _fake_verify(GoogleIdentity(sub="google-sub-linked", email=email)),
    )
    resp = await client.post("/auth/google", json={"id_token": "whatever"})
    assert resp.status_code == 200, resp.text
    google_access_token = resp.json()["access_token"]

    resp = await client.get(
        "/users/me", headers={"Authorization": f"Bearer {google_access_token}"}
    )
    assert resp.status_code == 200
    assert resp.json()["user_id"] == password_user_id
    assert resp.json()["email"] == email


async def test_google_login_rejects_unverified_email(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        "src.services.auth_service.verify_google_id_token", _fake_verify_raises()
    )
    resp = await client.post("/auth/google", json={"id_token": "whatever"})
    assert resp.status_code == 401


async def test_password_login_rejected_for_google_only_account(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    email = unique_email()
    monkeypatch.setattr(
        "src.services.auth_service.verify_google_id_token",
        _fake_verify(GoogleIdentity(sub="google-sub-only", email=email)),
    )
    resp = await client.post("/auth/google", json={"id_token": "whatever"})
    assert resp.status_code == 200

    resp = await client.post(
        "/auth/login", json={"email": email, "password": "anything-at-all-1"}
    )
    assert resp.status_code == 401


async def test_repeat_google_login_reuses_the_same_account(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    email = unique_email()
    monkeypatch.setattr(
        "src.services.auth_service.verify_google_id_token",
        _fake_verify(GoogleIdentity(sub="google-sub-repeat", email=email)),
    )

    resp = await client.post("/auth/google", json={"id_token": "whatever"})
    assert resp.status_code == 200, resp.text
    first_user_id = (
        await client.get(
            "/users/me",
            headers={"Authorization": f"Bearer {resp.json()['access_token']}"},
        )
    ).json()["user_id"]

    resp = await client.post("/auth/google", json={"id_token": "whatever"})
    assert resp.status_code == 200, resp.text
    second_user_id = (
        await client.get(
            "/users/me",
            headers={"Authorization": f"Bearer {resp.json()['access_token']}"},
        )
    ).json()["user_id"]

    assert first_user_id == second_user_id


async def test_concurrent_new_google_login_returns_winner_not_500(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Regression test: two concurrent first-time logins for the same
    brand-new Google account (double-click, retry-on-timeout) can both pass
    the "does a user with this google_id/email exist yet" checks before
    either commits. AuthService.login_with_google must recover (return the
    winner's tokens) instead of letting the loser's IntegrityError on the
    google_id/email unique constraints surface as a 500 - same recovery
    shape as OrderService's idempotency-key race. Uses separate sessions per
    "request", matching test_otp_service.py/test_order_service.py's pattern."""
    identity = GoogleIdentity(
        sub=f"race-sub-{uuid.uuid4().hex[:8]}",
        email=f"race-{uuid.uuid4().hex[:8]}@example.com",
    )
    monkeypatch.setattr(
        "src.services.auth_service.verify_google_id_token", lambda token: identity
    )

    async with engine.connect() as connection:
        await connection.begin()
        session_factory = async_sessionmaker(
            bind=connection,
            expire_on_commit=False,
            autoflush=False,
            join_transaction_mode="create_savepoint",
        )
        try:
            async with session_factory() as session_one:
                service = AuthService(
                    session_one, OtpService(session_one, RecordingEmailSender())
                )
                real_get_by_google_id = service._users.get_by_google_id
                real_get_by_email = service._users.get_by_email
                gid_calls = 0
                email_calls = 0

                async def lying_gid(google_id: str) -> User | None:
                    nonlocal gid_calls
                    gid_calls += 1
                    if gid_calls == 1:
                        return None
                    return await real_get_by_google_id(google_id)

                async def lying_email(email: str) -> User | None:
                    nonlocal email_calls
                    email_calls += 1
                    if email_calls == 1:
                        return None
                    return await real_get_by_email(email)

                # Deliberately replacing bound methods with plain functions -
                # ty sees a type mismatch against the descriptor's
                # bound-method type, but the call signature (minus self) and
                # return type match exactly. Same pattern as
                # test_order_service.py.
                service._users.get_by_google_id = lying_gid  # ty: ignore[invalid-assignment]
                service._users.get_by_email = lying_email  # ty: ignore[invalid-assignment]

                # "Request 2" wins the race: a real concurrent login creates
                # the account first, on a separate session.
                async with session_factory() as session_two:
                    winner = User(
                        email=identity.email,
                        password_hash=None,
                        google_id=identity.sub,
                        role=UserRole.CUSTOMER,
                        email_verified_at=datetime.now(UTC),
                    )
                    UserRepository(session_two).add(winner)
                    await session_two.commit()
                    winner_id = winner.user_id

                # "Request 1" still thinks (from its lying first checks) that
                # no such account exists yet, tries to create a duplicate,
                # and must recover to the winner instead of raising.
                tokens = await service.login_with_google("whatever-token")
                decoded = decode_token(tokens.access_token)
                assert int(decoded["sub"]) == winner_id
        finally:
            await connection.rollback()
