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


def _sale_payload(
    medicine_id: int, quantity: int = 2, customer_id: int | None = None
) -> dict:
    return {
        "items": [{"medicine_id": medicine_id, "quantity": quantity}],
        "customer_id": customer_id,
    }


async def test_pos_sale_decrements_stock(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, cashier_token = await make_user_with_token(UserRole.CASHIER)
    medicine_id = await _setup_medicine(
        client, auth_headers(admin_token), stock_quantity=10
    )

    resp = await client.post(
        "/sales",
        json=_sale_payload(medicine_id, 3),
        headers=auth_headers(cashier_token),
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["total_amount"] == "15.00"
    assert body["customer_id"] is None
    assert body["order_id"] is None
    assert body["items"][0]["medicine_name"]

    resp = await client.get(f"/medicines/{medicine_id}")
    assert resp.json()["stock_quantity"] == 7


async def test_pos_sale_with_known_customer(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, cashier_token = await make_user_with_token(UserRole.CASHIER)
    customer, _ = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(client, auth_headers(admin_token))

    resp = await client.post(
        "/sales",
        json=_sale_payload(medicine_id, 1, customer_id=customer.user_id),
        headers=auth_headers(cashier_token),
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["customer_id"] == customer.user_id


async def test_pos_sale_unknown_customer_returns_404(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, cashier_token = await make_user_with_token(UserRole.CASHIER)
    medicine_id = await _setup_medicine(client, auth_headers(admin_token))

    resp = await client.post(
        "/sales",
        json=_sale_payload(medicine_id, 1, customer_id=999999),
        headers=auth_headers(cashier_token),
    )
    assert resp.status_code == 404


async def test_pos_sale_unknown_medicine_returns_404(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, cashier_token = await make_user_with_token(UserRole.CASHIER)
    resp = await client.post(
        "/sales", json=_sale_payload(999999, 1), headers=auth_headers(cashier_token)
    )
    assert resp.status_code == 404


async def test_pos_sale_insufficient_stock_returns_409(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, cashier_token = await make_user_with_token(UserRole.CASHIER)
    medicine_id = await _setup_medicine(
        client, auth_headers(admin_token), stock_quantity=1
    )

    resp = await client.post(
        "/sales",
        json=_sale_payload(medicine_id, 5),
        headers=auth_headers(cashier_token),
    )
    assert resp.status_code == 409

    resp = await client.get(f"/medicines/{medicine_id}")
    assert resp.json()["stock_quantity"] == 1


async def test_pos_sale_requires_staff_role(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(client, auth_headers(admin_token))

    resp = await client.post(
        "/sales",
        json=_sale_payload(medicine_id, 1),
        headers=auth_headers(customer_token),
    )
    assert resp.status_code == 403


async def test_pos_sale_requires_auth(client: AsyncClient) -> None:
    resp = await client.post("/sales", json=_sale_payload(1, 1))
    assert resp.status_code == 401


async def test_list_and_get_sale(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, cashier_token = await make_user_with_token(UserRole.CASHIER)
    _, pharmacist_token = await make_user_with_token(UserRole.PHARMACIST)
    medicine_id = await _setup_medicine(client, auth_headers(admin_token))

    resp = await client.post(
        "/sales",
        json=_sale_payload(medicine_id, 1),
        headers=auth_headers(cashier_token),
    )
    sale_id = resp.json()["sale_id"]

    resp = await client.get(f"/sales/{sale_id}", headers=auth_headers(pharmacist_token))
    assert resp.status_code == 200
    assert resp.json()["sale_id"] == sale_id

    resp = await client.get("/sales", headers=auth_headers(pharmacist_token))
    assert resp.status_code == 200
    assert sale_id in {s["sale_id"] for s in resp.json()}

    resp = await client.get(f"/sales/{sale_id}", headers=auth_headers(cashier_token))
    assert resp.status_code == 200


async def test_get_unknown_sale_returns_404(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, cashier_token = await make_user_with_token(UserRole.CASHIER)
    resp = await client.get("/sales/999999", headers=auth_headers(cashier_token))
    assert resp.status_code == 404


async def test_completing_an_order_creates_a_sale_record(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(
        client, auth_headers(admin_token), stock_quantity=10
    )

    resp = await client.post(
        "/orders",
        json={
            "items": [{"medicine_id": medicine_id, "quantity": 2}],
            "fulfillment_type": "pickup",
            "payment_method": "card_simulated",
        },
        headers=auth_headers(customer_token),
    )
    order_id = resp.json()["order_id"]

    for target in ("ready", "completed"):
        resp = await client.patch(
            f"/orders/{order_id}/status",
            json={"status": target},
            headers=auth_headers(admin_token),
        )
        assert resp.status_code == 200, resp.text

    resp = await client.get("/sales", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    matching = [s for s in resp.json() if s["order_id"] == order_id]
    assert len(matching) == 1
    sale = matching[0]
    assert sale["customer_id"] is not None
    assert sale["employee_id"] is not None
    assert len(sale["items"]) == 1
    assert sale["items"][0]["medicine_id"] == medicine_id
    assert sale["items"][0]["quantity"] == 2

    # Completing an order doesn't decrement stock again - it was already
    # decremented at order placement time.
    resp = await client.get(f"/medicines/{medicine_id}")
    assert resp.json()["stock_quantity"] == 8
