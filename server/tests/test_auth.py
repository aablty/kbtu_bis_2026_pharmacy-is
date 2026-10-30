import uuid

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.user_repository import UserRepository
from tests.conftest import RecordingEmailSender


def unique_email() -> str:
    return f"test-{uuid.uuid4().hex[:12]}@example.com"


async def _register_and_verify(
    client: AsyncClient, email_sender: RecordingEmailSender, email: str
) -> None:
    resp = await client.post(
        "/auth/register", json={"email": email, "password": "correct-horse-1"}
    )
    assert resp.status_code == 201, resp.text

    code = email_sender.last_code_for(email)
    resp = await client.post("/auth/verify-email", json={"email": email, "code": code})
    assert resp.status_code == 200, resp.text


async def test_register_verify_login_flow(
    client: AsyncClient, email_sender: RecordingEmailSender
) -> None:
    email = unique_email()

    resp = await client.post(
        "/auth/register", json={"email": email, "password": "correct-horse-1"}
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["email"] == email

    # Logging in before verification is rejected.
    resp = await client.post(
        "/auth/login", json={"email": email, "password": "correct-horse-1"}
    )
    assert resp.status_code == 403

    code = email_sender.last_code_for(email)
    resp = await client.post("/auth/verify-email", json={"email": email, "code": code})
    assert resp.status_code == 200

    resp = await client.post(
        "/auth/login", json={"email": email, "password": "correct-horse-1"}
    )
    assert resp.status_code == 200
    tokens = resp.json()
    assert tokens["access_token"]
    assert tokens["refresh_token"]

    resp = await client.get(
        "/users/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == email


async def test_duplicate_registration_rejected(
    client: AsyncClient, email_sender: RecordingEmailSender
) -> None:
    email = unique_email()
    await _register_and_verify(client, email_sender, email)

    resp = await client.post(
        "/auth/register", json={"email": email, "password": "another-pass-1"}
    )
    assert resp.status_code == 409


async def test_wrong_otp_code_is_rejected_and_locks_after_max_attempts(
    client: AsyncClient, email_sender: RecordingEmailSender
) -> None:
    email = unique_email()
    resp = await client.post(
        "/auth/register", json={"email": email, "password": "correct-horse-1"}
    )
    assert resp.status_code == 201

    for _ in range(5):
        resp = await client.post(
            "/auth/verify-email", json={"email": email, "code": "000000"}
        )
        assert resp.status_code == 400

    resp = await client.post(
        "/auth/verify-email", json={"email": email, "code": "000000"}
    )
    assert resp.status_code == 429


async def test_login_wrong_password_rejected(
    client: AsyncClient, email_sender: RecordingEmailSender
) -> None:
    email = unique_email()
    await _register_and_verify(client, email_sender, email)

    resp = await client.post(
        "/auth/login", json={"email": email, "password": "wrong-password"}
    )
    assert resp.status_code == 401


async def test_password_reset_flow(
    client: AsyncClient, email_sender: RecordingEmailSender
) -> None:
    email = unique_email()
    await _register_and_verify(client, email_sender, email)

    resp = await client.post("/auth/forgot-password", json={"email": email})
    assert resp.status_code == 200

    code = email_sender.last_code_for(email)
    resp = await client.post(
        "/auth/reset-password",
        json={"email": email, "code": code, "new_password": "brand-new-pass-1"},
    )
    assert resp.status_code == 200

    resp = await client.post(
        "/auth/login", json={"email": email, "password": "brand-new-pass-1"}
    )
    assert resp.status_code == 200

    resp = await client.post(
        "/auth/login", json={"email": email, "password": "correct-horse-1"}
    )
    assert resp.status_code == 401


async def test_protected_endpoint_requires_token(client: AsyncClient) -> None:
    resp = await client.get("/users/me")
    assert resp.status_code == 401


async def test_login_email_is_case_insensitive(
    client: AsyncClient, email_sender: RecordingEmailSender
) -> None:
    email = unique_email()
    await _register_and_verify(client, email_sender, email)

    resp = await client.post(
        "/auth/login",
        json={"email": email.upper(), "password": "correct-horse-1"},
    )
    assert resp.status_code == 200

    # And registering the same address again, in a different case, is still a duplicate.
    resp = await client.post(
        "/auth/register",
        json={"email": email.upper(), "password": "another-pass-1"},
    )
    assert resp.status_code == 409


async def test_forgot_password_response_identical_for_unknown_email(
    client: AsyncClient, email_sender: RecordingEmailSender
) -> None:
    registered_email = unique_email()
    await _register_and_verify(client, email_sender, registered_email)

    # First call for a registered address starts the cooldown window.
    resp = await client.post("/auth/forgot-password", json={"email": registered_email})
    assert resp.status_code == 200
    registered_body = resp.json()

    # A second call within the cooldown window must look identical to the caller -
    # no status-code difference that would let an attacker fingerprint registered emails.
    resp = await client.post("/auth/forgot-password", json={"email": registered_email})
    assert resp.status_code == 200
    assert resp.json() == registered_body

    resp = await client.post("/auth/forgot-password", json={"email": unique_email()})
    assert resp.status_code == 200
    assert resp.json() == registered_body


async def test_refresh_rejected_after_user_deactivated(
    client: AsyncClient, email_sender: RecordingEmailSender, db_session: AsyncSession
) -> None:
    email = unique_email()
    await _register_and_verify(client, email_sender, email)

    resp = await client.post(
        "/auth/login", json={"email": email, "password": "correct-horse-1"}
    )
    assert resp.status_code == 200
    refresh_token = resp.json()["refresh_token"]

    user = await UserRepository(db_session).get_by_email(email)
    assert user is not None
    user.is_active = False
    await db_session.commit()

    resp = await client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 401
