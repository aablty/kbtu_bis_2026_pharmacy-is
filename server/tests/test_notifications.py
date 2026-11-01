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
    reorder_threshold: int = 0,
    requires_prescription: bool = False,
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
            "price": "5.00",
            "category_id": category_id,
            "supplier_id": supplier_id,
            "stock_quantity": stock_quantity,
            "reorder_threshold": reorder_threshold,
            "requires_prescription": requires_prescription,
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["medicine_id"]


def _order_payload(medicine_id: int, quantity: int = 1) -> dict:
    return {
        "items": [{"medicine_id": medicine_id, "quantity": quantity}],
        "fulfillment_type": "pickup",
        "payment_method": "card_simulated",
    }


async def test_order_status_change_notifies_customer(
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
    assert resp.status_code == 201, resp.text
    order_id = resp.json()["order_id"]

    resp = await client.patch(
        f"/orders/{order_id}/status",
        json={"status": "ready"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 200, resp.text

    resp = await client.get("/notifications", headers=auth_headers(customer_token))
    assert resp.status_code == 200
    notifications = resp.json()
    matches = [n for n in notifications if n["type"] == "order_status"]
    assert any(
        str(order_id) in n["message"] and "ready" in n["message"] for n in matches
    )
    assert all(n["related_id"] == order_id for n in matches)


async def test_prescription_review_notifies_customer(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, pharmacist_token = await make_user_with_token(UserRole.PHARMACIST)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)

    resp = await client.post(
        "/prescriptions",
        files={"file": ("scan.jpg", b"fake-image-bytes", "image/jpeg")},
        headers=auth_headers(customer_token),
    )
    assert resp.status_code == 201, resp.text
    prescription_id = resp.json()["prescription_id"]

    resp = await client.patch(
        f"/prescriptions/{prescription_id}/review",
        json={"approve": True},
        headers=auth_headers(pharmacist_token),
    )
    assert resp.status_code == 200, resp.text

    resp = await client.get("/notifications", headers=auth_headers(customer_token))
    assert resp.status_code == 200
    notifications = resp.json()
    matches = [n for n in notifications if n["type"] == "prescription_status"]
    assert any("approved" in n["message"] for n in matches)
    assert all(n["related_id"] == prescription_id for n in matches)


async def test_low_stock_notifies_staff_not_customer_or_cashier(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, pharmacist_token = await make_user_with_token(UserRole.PHARMACIST)
    _, cashier_token = await make_user_with_token(UserRole.CASHIER)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(
        client, auth_headers(admin_token), stock_quantity=3, reorder_threshold=5
    )

    resp = await client.post(
        "/orders",
        json=_order_payload(medicine_id, 1),
        headers=auth_headers(customer_token),
    )
    assert resp.status_code == 201, resp.text

    resp = await client.get("/notifications", headers=auth_headers(pharmacist_token))
    assert resp.status_code == 200
    assert any(n["type"] == "low_stock" for n in resp.json())

    resp = await client.get("/notifications", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    assert any(n["type"] == "low_stock" for n in resp.json())

    resp = await client.get("/notifications", headers=auth_headers(cashier_token))
    assert resp.status_code == 200
    assert not any(n["type"] == "low_stock" for n in resp.json())

    resp = await client.get("/notifications", headers=auth_headers(customer_token))
    assert resp.status_code == 200
    assert not any(n["type"] == "low_stock" for n in resp.json())


async def test_no_low_stock_notification_while_well_above_threshold(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, pharmacist_token = await make_user_with_token(UserRole.PHARMACIST)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(
        client, auth_headers(admin_token), stock_quantity=100, reorder_threshold=2
    )

    resp = await client.post(
        "/orders",
        json=_order_payload(medicine_id, 1),
        headers=auth_headers(customer_token),
    )
    assert resp.status_code == 201, resp.text

    resp = await client.get("/notifications", headers=auth_headers(pharmacist_token))
    assert resp.status_code == 200
    assert not any(
        n["type"] == "low_stock" and n["related_id"] == medicine_id for n in resp.json()
    )


async def test_low_stock_notification_not_repeated_while_unread(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    """Regression test: a still-low medicine shouldn't queue a fresh
    low_stock notification for a staff member who already has one unread
    for it - otherwise every order/sale against it floods the feed."""
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, pharmacist_token = await make_user_with_token(UserRole.PHARMACIST)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(
        client, auth_headers(admin_token), stock_quantity=10, reorder_threshold=8
    )

    for _ in range(3):
        resp = await client.post(
            "/orders",
            json=_order_payload(medicine_id, 1),
            headers=auth_headers(customer_token),
        )
        assert resp.status_code == 201, resp.text

    resp = await client.get("/notifications", headers=auth_headers(pharmacist_token))
    assert resp.status_code == 200
    matches = [
        n
        for n in resp.json()
        if n["type"] == "low_stock" and n["related_id"] == medicine_id
    ]
    assert len(matches) == 1

    # Once marked read, the next trigger queues a new one.
    resp = await client.patch(
        f"/notifications/{matches[0]['notification_id']}/read",
        headers=auth_headers(pharmacist_token),
    )
    assert resp.status_code == 200

    resp = await client.post(
        "/orders",
        json=_order_payload(medicine_id, 1),
        headers=auth_headers(customer_token),
    )
    assert resp.status_code == 201, resp.text

    resp = await client.get("/notifications", headers=auth_headers(pharmacist_token))
    matches = [
        n
        for n in resp.json()
        if n["type"] == "low_stock" and n["related_id"] == medicine_id
    ]
    assert len(matches) == 2


async def test_duplicate_medicine_in_one_order_notifies_once(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    """Regression test: two line items for the same medicine in one order
    must still only queue one low_stock notification per staff member, not
    two."""
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, pharmacist_token = await make_user_with_token(UserRole.PHARMACIST)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(
        client, auth_headers(admin_token), stock_quantity=10, reorder_threshold=8
    )

    resp = await client.post(
        "/orders",
        json={
            "items": [
                {"medicine_id": medicine_id, "quantity": 1},
                {"medicine_id": medicine_id, "quantity": 1},
            ],
            "fulfillment_type": "pickup",
            "payment_method": "card_simulated",
        },
        headers=auth_headers(customer_token),
    )
    assert resp.status_code == 201, resp.text

    resp = await client.get("/notifications", headers=auth_headers(pharmacist_token))
    matches = [
        n
        for n in resp.json()
        if n["type"] == "low_stock" and n["related_id"] == medicine_id
    ]
    assert len(matches) == 1


async def test_mark_notification_read(
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
    await client.patch(
        f"/orders/{order_id}/status",
        json={"status": "ready"},
        headers=auth_headers(admin_token),
    )

    resp = await client.get(
        "/notifications?unread_only=true", headers=auth_headers(customer_token)
    )
    unread = resp.json()
    assert len(unread) >= 1
    notification_id = unread[0]["notification_id"]

    resp = await client.patch(
        f"/notifications/{notification_id}/read", headers=auth_headers(customer_token)
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["read_at"] is not None

    resp = await client.get(
        "/notifications?unread_only=true", headers=auth_headers(customer_token)
    )
    assert notification_id not in {n["notification_id"] for n in resp.json()}


async def test_cannot_mark_another_users_notification_read(
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
    await client.patch(
        f"/orders/{order_id}/status",
        json={"status": "ready"},
        headers=auth_headers(admin_token),
    )

    resp = await client.get("/notifications", headers=auth_headers(owner_token))
    notification_id = resp.json()[0]["notification_id"]

    resp = await client.patch(
        f"/notifications/{notification_id}/read", headers=auth_headers(other_token)
    )
    assert resp.status_code == 403


async def test_mark_unknown_notification_returns_404(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    resp = await client.patch(
        "/notifications/999999/read", headers=auth_headers(customer_token)
    )
    assert resp.status_code == 404
