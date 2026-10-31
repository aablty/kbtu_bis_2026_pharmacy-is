from httpx import AsyncClient, Response

from src.models.enums import UserRole
from tests.conftest import MakeUserWithToken


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _upload(
    client: AsyncClient, token: str, *, content_type: str = "image/jpeg"
) -> Response:
    return await client.post(
        "/prescriptions",
        files={"file": ("scan.jpg", b"fake-image-bytes", content_type)},
        headers=auth_headers(token),
    )


async def test_customer_can_upload_prescription(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    resp = await _upload(client, customer_token)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "pending"
    assert body["file_url"]


async def test_upload_rejects_unsupported_file_type(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    resp = await _upload(client, customer_token, content_type="text/plain")
    assert resp.status_code == 400


async def test_staff_role_cannot_upload_prescription(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, pharmacist_token = await make_user_with_token(UserRole.PHARMACIST)
    resp = await _upload(client, pharmacist_token)
    assert resp.status_code == 403


async def test_customer_sees_only_own_prescriptions_staff_sees_all(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, customer_a_token = await make_user_with_token(UserRole.CUSTOMER)
    _, customer_b_token = await make_user_with_token(UserRole.CUSTOMER)
    _, pharmacist_token = await make_user_with_token(UserRole.PHARMACIST)

    resp_a = await _upload(client, customer_a_token)
    resp_b = await _upload(client, customer_b_token)
    prescription_a_id = resp_a.json()["prescription_id"]
    prescription_b_id = resp_b.json()["prescription_id"]

    resp = await client.get("/prescriptions", headers=auth_headers(customer_a_token))
    assert [p["prescription_id"] for p in resp.json()] == [prescription_a_id]

    resp = await client.get("/prescriptions", headers=auth_headers(pharmacist_token))
    staff_ids = {p["prescription_id"] for p in resp.json()}
    assert {prescription_a_id, prescription_b_id} <= staff_ids


async def test_get_prescription_forbidden_for_other_customer(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, owner_token = await make_user_with_token(UserRole.CUSTOMER)
    _, other_token = await make_user_with_token(UserRole.CUSTOMER)
    resp = await _upload(client, owner_token)
    prescription_id = resp.json()["prescription_id"]

    resp = await client.get(
        f"/prescriptions/{prescription_id}", headers=auth_headers(other_token)
    )
    assert resp.status_code == 403

    resp = await client.get(
        f"/prescriptions/{prescription_id}", headers=auth_headers(owner_token)
    )
    assert resp.status_code == 200


async def test_pharmacist_can_approve_prescription(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    _, pharmacist_token = await make_user_with_token(UserRole.PHARMACIST)
    resp = await _upload(client, customer_token)
    prescription_id = resp.json()["prescription_id"]

    resp = await client.patch(
        f"/prescriptions/{prescription_id}/review",
        json={"approve": True},
        headers=auth_headers(pharmacist_token),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "approved"
    assert body["reviewed_by"] is not None


async def test_rejecting_requires_a_reason(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    _, pharmacist_token = await make_user_with_token(UserRole.PHARMACIST)
    resp = await _upload(client, customer_token)
    prescription_id = resp.json()["prescription_id"]

    resp = await client.patch(
        f"/prescriptions/{prescription_id}/review",
        json={"approve": False},
        headers=auth_headers(pharmacist_token),
    )
    assert resp.status_code == 422

    resp = await client.patch(
        f"/prescriptions/{prescription_id}/review",
        json={"approve": False, "reason": "Illegible scan"},
        headers=auth_headers(pharmacist_token),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


async def test_cannot_review_an_already_reviewed_prescription(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    _, pharmacist_token = await make_user_with_token(UserRole.PHARMACIST)
    resp = await _upload(client, customer_token)
    prescription_id = resp.json()["prescription_id"]

    resp = await client.patch(
        f"/prescriptions/{prescription_id}/review",
        json={"approve": True},
        headers=auth_headers(pharmacist_token),
    )
    assert resp.status_code == 200

    resp = await client.patch(
        f"/prescriptions/{prescription_id}/review",
        json={"approve": True},
        headers=auth_headers(pharmacist_token),
    )
    assert resp.status_code == 409


async def test_cashier_cannot_review_prescription(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    _, cashier_token = await make_user_with_token(UserRole.CASHIER)
    resp = await _upload(client, customer_token)
    prescription_id = resp.json()["prescription_id"]

    resp = await client.patch(
        f"/prescriptions/{prescription_id}/review",
        json={"approve": True},
        headers=auth_headers(cashier_token),
    )
    assert resp.status_code == 403
