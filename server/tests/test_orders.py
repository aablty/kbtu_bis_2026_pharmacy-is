import uuid

from httpx import AsyncClient

from src.models.enums import UserRole
from tests.conftest import MakeUserWithToken


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _setup_medicine(
    client: AsyncClient,
    admin_headers: dict[str, str],
    *,
    stock_quantity: int = 10,
    price: str = "5.00",
) -> int:
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
            "price": price,
            "category_id": category_id,
            "supplier_id": supplier_id,
            "stock_quantity": stock_quantity,
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["medicine_id"]


def _order_payload(medicine_id: int, quantity: int = 2) -> dict:
    return {
        "items": [{"medicine_id": medicine_id, "quantity": quantity}],
        "fulfillment_type": "pickup",
        "payment_method": "card_simulated",
    }


async def test_place_order_confirms_and_decrements_stock(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(
        client, auth_headers(admin_token), stock_quantity=10
    )

    resp = await client.post(
        "/orders",
        json=_order_payload(medicine_id, 3),
        headers=auth_headers(customer_token),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "confirmed"
    assert body["payment"]["status"] == "paid"
    assert body["total_amount"] == "15.00"
    assert len(body["items"]) == 1

    resp = await client.get(f"/medicines/{medicine_id}")
    assert resp.json()["stock_quantity"] == 7


async def test_place_order_insufficient_stock_returns_409(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(
        client, auth_headers(admin_token), stock_quantity=1
    )

    resp = await client.post(
        "/orders",
        json=_order_payload(medicine_id, 5),
        headers=auth_headers(customer_token),
    )
    assert resp.status_code == 409

    resp = await client.get(f"/medicines/{medicine_id}")
    assert resp.json()["stock_quantity"] == 1


async def test_place_order_unknown_medicine_returns_404(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    resp = await client.post(
        "/orders", json=_order_payload(999999, 1), headers=auth_headers(customer_token)
    )
    assert resp.status_code == 404


async def test_delivery_without_address_is_rejected(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(client, auth_headers(admin_token))

    payload = _order_payload(medicine_id)
    payload["fulfillment_type"] = "delivery"

    resp = await client.post(
        "/orders", json=payload, headers=auth_headers(customer_token)
    )
    assert resp.status_code == 422


async def test_only_customer_role_can_place_order(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    medicine_id = await _setup_medicine(client, auth_headers(admin_token))

    resp = await client.post(
        "/orders", json=_order_payload(medicine_id), headers=auth_headers(admin_token)
    )
    assert resp.status_code == 403


async def test_idempotency_key_prevents_duplicate_order(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(
        client, auth_headers(admin_token), stock_quantity=10
    )

    headers = {**auth_headers(customer_token), "Idempotency-Key": "retry-key-1"}
    resp1 = await client.post(
        "/orders", json=_order_payload(medicine_id, 2), headers=headers
    )
    assert resp1.status_code == 201
    resp2 = await client.post(
        "/orders", json=_order_payload(medicine_id, 2), headers=headers
    )
    assert resp2.status_code == 201
    assert resp1.json()["order_id"] == resp2.json()["order_id"]

    # Stock should only have been decremented once, not twice.
    resp = await client.get(f"/medicines/{medicine_id}")
    assert resp.json()["stock_quantity"] == 8


async def test_customers_see_only_their_own_orders_staff_see_all(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, customer_a_token = await make_user_with_token(UserRole.CUSTOMER)
    _, customer_b_token = await make_user_with_token(UserRole.CUSTOMER)
    _, pharmacist_token = await make_user_with_token(UserRole.PHARMACIST)
    medicine_id = await _setup_medicine(
        client, auth_headers(admin_token), stock_quantity=10
    )

    resp_a = await client.post(
        "/orders",
        json=_order_payload(medicine_id, 1),
        headers=auth_headers(customer_a_token),
    )
    resp_b = await client.post(
        "/orders",
        json=_order_payload(medicine_id, 1),
        headers=auth_headers(customer_b_token),
    )
    order_a_id = resp_a.json()["order_id"]
    order_b_id = resp_b.json()["order_id"]

    resp = await client.get("/orders", headers=auth_headers(customer_a_token))
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # The dev database is a shared, persistent branch - other sessions' manual
    # smoke-test orders may already be sitting in it, so assert presence of
    # *these* orders rather than an exact total count for the staff-wide view.
    resp = await client.get("/orders", headers=auth_headers(pharmacist_token))
    assert resp.status_code == 200
    staff_order_ids = {order["order_id"] for order in resp.json()}
    assert {order_a_id, order_b_id} <= staff_order_ids


async def test_get_order_forbidden_for_other_customer(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, owner_token = await make_user_with_token(UserRole.CUSTOMER)
    _, other_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(client, auth_headers(admin_token))

    resp = await client.post(
        "/orders", json=_order_payload(medicine_id), headers=auth_headers(owner_token)
    )
    order_id = resp.json()["order_id"]

    resp = await client.get(f"/orders/{order_id}", headers=auth_headers(other_token))
    assert resp.status_code == 403

    resp = await client.get(f"/orders/{order_id}", headers=auth_headers(owner_token))
    assert resp.status_code == 200


async def test_status_lifecycle_and_invalid_transition(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(client, auth_headers(admin_token))

    resp = await client.post(
        "/orders",
        json=_order_payload(medicine_id),
        headers=auth_headers(customer_token),
    )
    order_id = resp.json()["order_id"]
    assert resp.json()["status"] == "confirmed"

    # Skipping straight to "completed" from "confirmed" is not a legal transition.
    resp = await client.patch(
        f"/orders/{order_id}/status",
        json={"status": "completed"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 400

    resp = await client.patch(
        f"/orders/{order_id}/status",
        json={"status": "ready"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ready"

    resp = await client.patch(
        f"/orders/{order_id}/status",
        json={"status": "completed"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"

    # Terminal state - no further transitions allowed.
    resp = await client.patch(
        f"/orders/{order_id}/status",
        json={"status": "cancelled"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 400


async def test_customer_cannot_update_order_status(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(client, auth_headers(admin_token))

    resp = await client.post(
        "/orders",
        json=_order_payload(medicine_id),
        headers=auth_headers(customer_token),
    )
    order_id = resp.json()["order_id"]

    resp = await client.patch(
        f"/orders/{order_id}/status",
        json={"status": "ready"},
        headers=auth_headers(customer_token),
    )
    assert resp.status_code == 403


async def test_cancelling_an_order_restocks_the_medicine(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(
        client, auth_headers(admin_token), stock_quantity=10
    )

    resp = await client.post(
        "/orders",
        json=_order_payload(medicine_id, 4),
        headers=auth_headers(customer_token),
    )
    order_id = resp.json()["order_id"]

    resp = await client.get(f"/medicines/{medicine_id}")
    assert resp.json()["stock_quantity"] == 6

    resp = await client.patch(
        f"/orders/{order_id}/status",
        json={"status": "cancelled"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"

    resp = await client.get(f"/medicines/{medicine_id}")
    assert resp.json()["stock_quantity"] == 10


async def test_idempotency_key_cannot_leak_another_customers_order(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, customer_a_token = await make_user_with_token(UserRole.CUSTOMER)
    _, customer_b_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(
        client, auth_headers(admin_token), stock_quantity=10
    )

    shared_key = "shared-key-attack"
    resp = await client.post(
        "/orders",
        json=_order_payload(medicine_id, 1),
        headers={**auth_headers(customer_a_token), "Idempotency-Key": shared_key},
    )
    assert resp.status_code == 201
    customer_a_order_id = resp.json()["order_id"]

    # Customer B reuses customer A's key for a genuinely different order - must
    # not get customer A's order (total, items, delivery address) handed back.
    resp = await client.post(
        "/orders",
        json=_order_payload(medicine_id, 1),
        headers={**auth_headers(customer_b_token), "Idempotency-Key": shared_key},
    )
    assert resp.status_code == 409
    body = resp.json()
    assert "order_id" not in body
    assert str(customer_a_order_id) not in resp.text

    # And customer B still cannot fetch customer A's order directly either.
    resp = await client.get(
        f"/orders/{customer_a_order_id}", headers=auth_headers(customer_b_token)
    )
    assert resp.status_code == 403


async def test_idempotency_key_over_max_length_rejected(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(client, auth_headers(admin_token))

    resp = await client.post(
        "/orders",
        json=_order_payload(medicine_id),
        headers={**auth_headers(customer_token), "Idempotency-Key": "x" * 101},
    )
    assert resp.status_code == 422


async def test_cancelling_a_paid_order_marks_payment_refunded(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(client, auth_headers(admin_token))

    resp = await client.post(
        "/orders",
        json=_order_payload(medicine_id),
        headers=auth_headers(customer_token),
    )
    order_id = resp.json()["order_id"]
    assert resp.json()["payment"]["status"] == "paid"

    resp = await client.patch(
        f"/orders/{order_id}/status",
        json={"status": "cancelled"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["payment"]["status"] == "refunded"


async def test_order_item_includes_medicine_name(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(client, auth_headers(admin_token))

    resp = await client.get(f"/medicines/{medicine_id}")
    expected_name = resp.json()["name"]

    resp = await client.post(
        "/orders",
        json=_order_payload(medicine_id),
        headers=auth_headers(customer_token),
    )
    assert resp.json()["items"][0]["medicine_name"] == expected_name


# The concurrent idempotency-key race (two requests, same key, neither has
# committed when the other checks) is covered in tests/test_order_service.py
# using separate sessions per "request" - reusing one shared session here
# (as this file's `client` fixture does) can't faithfully simulate the
# commit/rollback boundary the real bug and fix are both about.
