import uuid
from decimal import Decimal

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
            "reorder_threshold": reorder_threshold,
        },
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["medicine_id"]


async def test_analytics_requires_admin(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    for role in (UserRole.PHARMACIST, UserRole.CASHIER, UserRole.CUSTOMER):
        _, token = await make_user_with_token(role)
        resp = await client.get("/analytics/best-sellers", headers=auth_headers(token))
        assert resp.status_code == 403
        resp = await client.get("/analytics/low-stock", headers=auth_headers(token))
        assert resp.status_code == 403
        resp = await client.get("/analytics/revenue", headers=auth_headers(token))
        assert resp.status_code == 403


async def test_best_sellers_and_revenue_do_not_double_count_completed_orders(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    """Regression test: completing an order creates a Sale row with
    order_id set (bookkeeping, not a new sale) - best-sellers/revenue must
    count that order's items/payment once, not twice."""
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(
        client, auth_headers(admin_token), price="10.00"
    )

    resp = await client.post(
        "/orders",
        json={
            "items": [{"medicine_id": medicine_id, "quantity": 3}],
            "fulfillment_type": "pickup",
            "payment_method": "card_simulated",
        },
        headers=auth_headers(customer_token),
    )
    assert resp.status_code == 201, resp.text
    order_id = resp.json()["order_id"]

    for target in ("ready", "completed"):
        resp = await client.patch(
            f"/orders/{order_id}/status",
            json={"status": target},
            headers=auth_headers(admin_token),
        )
        assert resp.status_code == 200, resp.text

    resp = await client.get(
        "/analytics/best-sellers?limit=100", headers=auth_headers(admin_token)
    )
    assert resp.status_code == 200
    matches = [r for r in resp.json() if r["medicine_id"] == medicine_id]
    assert len(matches) == 1
    assert matches[0]["units_sold"] == 3

    resp = await client.get(
        "/analytics/revenue?days=1", headers=auth_headers(admin_token)
    )
    assert resp.status_code == 200
    body = resp.json()
    assert Decimal(str(body["total_revenue"])) >= Decimal("30.00")


async def test_best_sellers_excludes_cancelled_orders(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    medicine_id = await _setup_medicine(client, auth_headers(admin_token))

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
    resp = await client.patch(
        f"/orders/{order_id}/status",
        json={"status": "cancelled"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 200

    resp = await client.get(
        "/analytics/best-sellers?limit=100", headers=auth_headers(admin_token)
    )
    assert resp.status_code == 200
    assert not any(r["medicine_id"] == medicine_id for r in resp.json())


async def test_best_sellers_counts_pos_sale(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, cashier_token = await make_user_with_token(UserRole.CASHIER)
    medicine_id = await _setup_medicine(client, auth_headers(admin_token))

    resp = await client.post(
        "/sales",
        json={"items": [{"medicine_id": medicine_id, "quantity": 4}]},
        headers=auth_headers(cashier_token),
    )
    assert resp.status_code == 201, resp.text

    resp = await client.get(
        "/analytics/best-sellers?limit=100", headers=auth_headers(admin_token)
    )
    assert resp.status_code == 200
    matches = [r for r in resp.json() if r["medicine_id"] == medicine_id]
    assert len(matches) == 1
    assert matches[0]["units_sold"] == 4


async def test_best_sellers_merges_renamed_medicine_into_one_row(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    """Regression test: medicine_name is frozen per order/sale item, so a
    medicine renamed between two sales must still be one best-sellers row
    for its medicine_id, not split across the old/new name."""
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    _, cashier_token = await make_user_with_token(UserRole.CASHIER)
    medicine_id = await _setup_medicine(client, auth_headers(admin_token))

    resp = await client.post(
        "/sales",
        json={"items": [{"medicine_id": medicine_id, "quantity": 2}]},
        headers=auth_headers(cashier_token),
    )
    assert resp.status_code == 201, resp.text

    resp = await client.put(
        f"/medicines/{medicine_id}",
        json={"name": "Renamed Medicine"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 200, resp.text

    resp = await client.post(
        "/sales",
        json={"items": [{"medicine_id": medicine_id, "quantity": 5}]},
        headers=auth_headers(cashier_token),
    )
    assert resp.status_code == 201, resp.text

    resp = await client.get(
        "/analytics/best-sellers?limit=100", headers=auth_headers(admin_token)
    )
    assert resp.status_code == 200
    matches = [r for r in resp.json() if r["medicine_id"] == medicine_id]
    assert len(matches) == 1
    assert matches[0]["units_sold"] == 7


async def test_low_stock_lists_medicines_at_or_under_threshold(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    low_id = await _setup_medicine(
        client, auth_headers(admin_token), stock_quantity=2, reorder_threshold=5
    )
    healthy_id = await _setup_medicine(
        client, auth_headers(admin_token), stock_quantity=100, reorder_threshold=2
    )

    resp = await client.get("/analytics/low-stock", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    ids = {m["medicine_id"] for m in resp.json()}
    assert low_id in ids
    assert healthy_id not in ids
