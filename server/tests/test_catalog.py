from unittest.mock import AsyncMock

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.main import app
from src.models.enums import UserRole
from src.routers.deps import get_category_service
from src.services.category_service import CategoryService
from tests.conftest import MakeUserWithToken


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _create_supplier(client: AsyncClient, admin_headers: dict[str, str]) -> int:
    resp = await client.post(
        "/suppliers",
        json={"name": "Acme Pharma", "contact_phone": "+1-555-0100"},
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["supplier_id"]


async def _create_category(
    client: AsyncClient,
    admin_headers: dict[str, str],
    name: str,
    parent_id: int | None = None,
) -> dict:
    resp = await client.post(
        "/categories",
        json={"name": name, "parent_id": parent_id},
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_admin_full_crud_flow(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    headers = auth_headers(admin_token)

    supplier_id = await _create_supplier(client, headers)
    category = await _create_category(client, headers, "Pain Relief")

    resp = await client.post(
        "/medicines",
        json={
            "name": "Ibuprofen 200mg",
            "manufacturer": "Acme Pharma",
            "price": "4.50",
            "category_id": category["category_id"],
            "supplier_id": supplier_id,
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    medicine = resp.json()
    assert medicine["stock_quantity"] == 0
    assert medicine["requires_prescription"] is False

    resp = await client.put(
        f"/medicines/{medicine['medicine_id']}",
        json={"stock_quantity": 50, "requires_prescription": True},
        headers=headers,
    )
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["stock_quantity"] == 50
    assert updated["requires_prescription"] is True

    resp = await client.get(f"/medicines/{medicine['medicine_id']}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Ibuprofen 200mg"


async def test_non_admin_cannot_write(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    headers = auth_headers(customer_token)

    resp = await client.post(
        "/suppliers", json={"name": "Shadow Supplier"}, headers=headers
    )
    assert resp.status_code == 403

    resp = await client.post(
        "/categories", json={"name": "Shadow Category"}, headers=headers
    )
    assert resp.status_code == 403


async def test_write_endpoints_require_auth(client: AsyncClient) -> None:
    resp = await client.post("/suppliers", json={"name": "No Auth"})
    assert resp.status_code == 401


async def test_public_catalog_browsing_needs_no_auth(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    headers = auth_headers(admin_token)
    supplier_id = await _create_supplier(client, headers)
    category = await _create_category(client, headers, "Cold & Flu")
    await client.post(
        "/medicines",
        json={
            "name": "Paracetamol",
            "price": "2.00",
            "category_id": category["category_id"],
            "supplier_id": supplier_id,
        },
        headers=headers,
    )

    resp = await client.get("/medicines")
    assert resp.status_code == 200
    resp = await client.get("/categories")
    assert resp.status_code == 200


async def test_category_slug_deduped_on_name_collision(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    headers = auth_headers(admin_token)

    first = await _create_category(client, headers, "Vitamins")
    second = await _create_category(client, headers, "Vitamins")

    assert first["slug"] != second["slug"]
    assert first["slug"] == "vitamins"
    assert second["slug"].startswith("vitamins-")


async def test_category_move_rejects_cycle(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    headers = auth_headers(admin_token)

    parent = await _create_category(client, headers, "Respiratory")
    child = await _create_category(
        client, headers, "Inhalers", parent_id=parent["category_id"]
    )

    resp = await client.put(
        f"/categories/{parent['category_id']}",
        json={"parent_id": child["category_id"]},
        headers=headers,
    )
    assert resp.status_code == 400


async def test_category_delete_blocked_while_in_use(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    headers = auth_headers(admin_token)

    parent = await _create_category(client, headers, "Supplements")
    await _create_category(client, headers, "Protein", parent_id=parent["category_id"])

    resp = await client.delete(f"/categories/{parent['category_id']}", headers=headers)
    assert resp.status_code == 409


async def test_supplier_delete_blocked_while_referenced_by_medicine(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    headers = auth_headers(admin_token)

    supplier_id = await _create_supplier(client, headers)
    category = await _create_category(client, headers, "Antibiotics")
    await client.post(
        "/medicines",
        json={
            "name": "Amoxicillin",
            "price": "9.99",
            "category_id": category["category_id"],
            "supplier_id": supplier_id,
        },
        headers=headers,
    )

    resp = await client.delete(f"/suppliers/{supplier_id}", headers=headers)
    assert resp.status_code == 409


async def test_search_filters_by_text_category_and_prescription_flag(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    headers = auth_headers(admin_token)
    supplier_id = await _create_supplier(client, headers)

    otc_root = await _create_category(client, headers, "OTC Root")
    otc_leaf = await _create_category(
        client, headers, "OTC Leaf", parent_id=otc_root["category_id"]
    )
    rx_root = await _create_category(client, headers, "Prescription Root")

    async def make_medicine(
        name: str, category_id: int, requires_prescription: bool
    ) -> None:
        resp = await client.post(
            "/medicines",
            json={
                "name": name,
                "price": "3.00",
                "category_id": category_id,
                "supplier_id": supplier_id,
                "requires_prescription": requires_prescription,
            },
            headers=headers,
        )
        assert resp.status_code == 201, resp.text

    await make_medicine("Zyrtec Allergy Relief", otc_leaf["category_id"], False)
    await make_medicine("Amoxiclav", rx_root["category_id"], True)

    resp = await client.get("/medicines", params={"q": "zyrtec"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Zyrtec Allergy Relief"

    # Filtering by the root category must also match the leaf category's medicine.
    resp = await client.get(
        "/medicines", params={"category_id": otc_root["category_id"]}
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Zyrtec Allergy Relief"

    resp = await client.get("/medicines", params={"requires_prescription": True})
    assert resp.status_code == 200
    body = resp.json()
    names = {item["name"] for item in body["items"]}
    assert "Amoxiclav" in names
    assert "Zyrtec Allergy Relief" not in names


async def test_search_unknown_category_returns_404(client: AsyncClient) -> None:
    resp = await client.get("/medicines", params={"category_id": 999999})
    assert resp.status_code == 404


async def test_supplier_reads_require_admin(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    """Unlike CATEGORIES/MEDICINES, SUPPLIERS has no public read endpoint -
    contact info is internal business data, not customer-facing catalog
    content. Deliberate, not an oversight - see .agents/plan/CLAUDE.md."""
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    supplier_id = await _create_supplier(client, auth_headers(admin_token))

    resp = await client.get("/suppliers")
    assert resp.status_code == 401

    resp = await client.get(f"/suppliers/{supplier_id}")
    assert resp.status_code == 401

    _, customer_token = await make_user_with_token(UserRole.CUSTOMER)
    resp = await client.get("/suppliers", headers=auth_headers(customer_token))
    assert resp.status_code == 403


async def test_medicine_rejects_non_leaf_category(
    client: AsyncClient, make_user_with_token: MakeUserWithToken
) -> None:
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    headers = auth_headers(admin_token)
    supplier_id = await _create_supplier(client, headers)

    parent = await _create_category(client, headers, "Has A Subcategory")
    await _create_category(
        client, headers, "Its Child", parent_id=parent["category_id"]
    )

    resp = await client.post(
        "/medicines",
        json={
            "name": "Misfiled Medicine",
            "price": "1.00",
            "category_id": parent["category_id"],
            "supplier_id": supplier_id,
        },
        headers=headers,
    )
    assert resp.status_code == 400

    # Same rule applies when moving an existing medicine onto a non-leaf category.
    leaf = await _create_category(client, headers, "A Real Leaf")
    resp = await client.post(
        "/medicines",
        json={
            "name": "Properly Filed Medicine",
            "price": "1.00",
            "category_id": leaf["category_id"],
            "supplier_id": supplier_id,
        },
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    medicine_id = resp.json()["medicine_id"]

    resp = await client.put(
        f"/medicines/{medicine_id}",
        json={"category_id": parent["category_id"]},
        headers=headers,
    )
    assert resp.status_code == 400


async def test_category_create_handles_slug_race(
    client: AsyncClient,
    make_user_with_token: MakeUserWithToken,
    db_session: AsyncSession,
) -> None:
    """Simulates the TOCTOU race _unique_slug can't fully close on its own:
    forces the uniqueness check to report 'free' for a slug that's already
    taken, so the only thing left to catch the collision is the DB commit."""
    _, admin_token = await make_user_with_token(UserRole.ADMIN)
    headers = auth_headers(admin_token)

    existing = await _create_category(client, headers, "Race")

    racy_service = CategoryService(db_session)
    racy_service._unique_slug = AsyncMock(return_value=existing["slug"])
    app.dependency_overrides[get_category_service] = lambda: racy_service

    resp = await client.post(
        "/categories", json={"name": "Race Again"}, headers=headers
    )
    assert resp.status_code == 409
