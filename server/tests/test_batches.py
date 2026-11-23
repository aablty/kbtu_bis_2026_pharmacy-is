import uuid

from httpx import AsyncClient

from src.models.enums import UserRole
from tests.conftest import MakeUserWithToken


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _setup_medicine_and_supplier(
    client: AsyncClient, admin_headers: dict[str, str]
) -> tuple[int, int]:
    resp = await client.post(
        "/suppliers",
        json={"name": f"Supplier {uuid.uuid4().hex[:6]}"},
        headers=admin_headers,
    )
    supplier_id = resp.json()["supplier_id"]

    resp = await client.post(
        "/categories",
        json={"name": f"Category {uuid.uuid4().hex[:6]}"},
        headers=admin_headers,
    )
    category_id = resp.json()["category_id"]

    resp = await client.post(
        "/medicines",
        json={
            "name": f"Medicine {uuid.uuid4().hex[:6]}",
            "price": "5.00",
            "category_id": category_id,
            "supplier_id": supplier_id,
            "stock_quantity": 0,
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["medicine_id"], supplier_id


async def test_receive_stock_records_who_received_it(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    pharmacist, pharmacist_token = await make_user_with_token(UserRole.PHARMACIST)
    medicine_id, supplier_id = await _setup_medicine_and_supplier(
        client, auth_headers(admin_token)
    )

    resp = await client.post(
        "/batches",
        json={
            "medicine_id": medicine_id,
            "supplier_id": supplier_id,
            "quantity": 10,
            "expiry_date": "2099-12-31",
        },
        headers=auth_headers(pharmacist_token),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["received_by"] == pharmacist.user_id
    assert body["received_by_name"] == pharmacist.email


async def test_receiving_activity_is_admin_only_and_filters_by_staff_member(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    pharmacist, pharmacist_token = await make_user_with_token(UserRole.PHARMACIST)
    medicine_id, supplier_id = await _setup_medicine_and_supplier(
        client, auth_headers(admin_token)
    )

    resp = await client.post(
        "/batches",
        json={
            "medicine_id": medicine_id,
            "supplier_id": supplier_id,
            "quantity": 10,
            "expiry_date": "2099-12-31",
        },
        headers=auth_headers(pharmacist_token),
    )
    assert resp.status_code == 201, resp.text
    batch_id = resp.json()["batch_id"]

    for role in (UserRole.PHARMACIST, UserRole.CASHIER, UserRole.CUSTOMER):
        _, token = await make_user_with_token(role)
        resp = await client.get(
            "/batches/receiving-activity", headers=auth_headers(token)
        )
        assert resp.status_code == 403

    resp = await client.get(
        f"/batches/receiving-activity?received_by={pharmacist.user_id}",
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 200
    ids = {row["batch_id"] for row in resp.json()}
    assert batch_id in ids
    assert all(row["received_by"] == pharmacist.user_id for row in resp.json())


async def test_write_off_reduces_remaining_and_rejects_over_remaining(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    medicine_id, supplier_id = await _setup_medicine_and_supplier(
        client, auth_headers(admin_token)
    )
    resp = await client.post(
        "/batches",
        json={
            "medicine_id": medicine_id,
            "supplier_id": supplier_id,
            "quantity": 10,
            "expiry_date": "2099-12-31",
        },
        headers=auth_headers(admin_token),
    )
    batch_id = resp.json()["batch_id"]

    resp = await client.post(
        f"/batches/{batch_id}/write-off",
        json={"quantity": 4, "reason": "damaged in transit"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["quantity"] == 4
    assert body["reason"] == "damaged in transit"

    resp = await client.post(
        f"/batches/{batch_id}/write-off",
        json={"quantity": 100},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 409

    resp = await client.post(
        f"/batches/{batch_id}/write-off",
        json={"quantity": 0},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 422


async def test_write_off_requires_admin_or_pharmacist(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    medicine_id, supplier_id = await _setup_medicine_and_supplier(
        client, auth_headers(admin_token)
    )
    resp = await client.post(
        "/batches",
        json={
            "medicine_id": medicine_id,
            "supplier_id": supplier_id,
            "quantity": 10,
            "expiry_date": "2099-12-31",
        },
        headers=auth_headers(admin_token),
    )
    batch_id = resp.json()["batch_id"]

    for role in (UserRole.CASHIER, UserRole.CUSTOMER):
        _, token = await make_user_with_token(role)
        resp = await client.post(
            f"/batches/{batch_id}/write-off",
            json={"quantity": 1},
            headers=auth_headers(token),
        )
        assert resp.status_code == 403
