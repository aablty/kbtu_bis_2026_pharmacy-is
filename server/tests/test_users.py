import uuid
from datetime import UTC, datetime

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import hash_password
from src.models.enums import UserRole
from src.models.user import User
from src.repositories.user_repository import UserRepository
from tests.conftest import MakeUserWithToken


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def test_search_users_by_name_or_email_case_insensitive(
    client: AsyncClient,
    db_session: AsyncSession,
    make_user_with_token: MakeUserWithToken,
) -> None:
    unique = uuid.uuid4().hex[:8]
    target = User(
        email=f"zendaya-{unique}@example.com",
        password_hash=hash_password("irrelevant-password-1"),
        full_name=f"Zendaya Target {unique}",
        role=UserRole.CUSTOMER,
        email_verified_at=datetime.now(UTC),
    )
    UserRepository(db_session).add(target)
    await db_session.commit()

    _, cashier_token = await make_user_with_token(UserRole.CASHIER)

    resp = await client.get(
        f"/users/search?q={unique.upper()}", headers=auth_headers(cashier_token)
    )
    assert resp.status_code == 200, resp.text
    results = resp.json()
    assert any(r["user_id"] == target.user_id for r in results)
    match = next(r for r in results if r["user_id"] == target.user_id)
    assert match["email"] == target.email
    assert match["full_name"] == target.full_name


async def test_search_users_excludes_staff_accounts(
    client: AsyncClient,
    db_session: AsyncSession,
    make_user_with_token: MakeUserWithToken,
) -> None:
    staff_user, cashier_token = await make_user_with_token(UserRole.PHARMACIST)
    search_term = staff_user.email.split("@")[0]

    resp = await client.get(
        f"/users/search?q={search_term}", headers=auth_headers(cashier_token)
    )
    assert resp.status_code == 200, resp.text
    assert not any(r["user_id"] == staff_user.user_id for r in resp.json())


async def test_search_users_requires_staff_role(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, token = await make_user_with_token(UserRole.CUSTOMER)

    resp = await client.get("/users/search?q=anything", headers=auth_headers(token))
    assert resp.status_code == 403


async def test_update_profile_trims_name(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, token = await make_user_with_token(UserRole.CUSTOMER)

    resp = await client.patch(
        "/users/me",
        json={"full_name": "  Ada Lovelace  "},
        headers=auth_headers(token),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["full_name"] == "Ada Lovelace"


async def test_update_profile_blank_name_clears_it(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, token = await make_user_with_token(UserRole.CUSTOMER)

    resp = await client.patch(
        "/users/me", json={"full_name": "   "}, headers=auth_headers(token)
    )
    assert resp.status_code == 200
    assert resp.json()["full_name"] is None


async def test_change_password_checks_current_then_works_for_login(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    user, token = await make_user_with_token(UserRole.CUSTOMER)
    headers = auth_headers(token)

    resp = await client.post(
        "/users/me/password",
        json={"current_password": "wrong-password", "new_password": "brand-new-pass-1"},
        headers=headers,
    )
    assert resp.status_code == 400

    resp = await client.post(
        "/users/me/password",
        json={
            "current_password": "irrelevant-password-1",
            "new_password": "brand-new-pass-1",
        },
        headers=headers,
    )
    assert resp.status_code == 200, resp.text

    resp = await client.post(
        "/auth/login", json={"email": user.email, "password": "brand-new-pass-1"}
    )
    assert resp.status_code == 200, resp.text


async def test_google_only_account_cannot_change_password(
    client: AsyncClient,
    db_session: AsyncSession,
    make_user_with_token: MakeUserWithToken,
) -> None:
    user, token = await make_user_with_token(UserRole.CUSTOMER)
    user.password_hash = None
    await db_session.commit()

    resp = await client.post(
        "/users/me/password",
        json={
            "current_password": "irrelevant-password-1",
            "new_password": "brand-new-pass-1",
        },
        headers=auth_headers(token),
    )
    assert resp.status_code == 400
    assert "no password" in resp.json()["detail"]
