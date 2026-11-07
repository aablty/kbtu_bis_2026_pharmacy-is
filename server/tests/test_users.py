from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.enums import UserRole
from tests.conftest import MakeUserWithToken


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


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
