from httpx import AsyncClient

from src.core.config import get_settings


async def test_cors_allows_configured_frontend_origin(client: AsyncClient) -> None:
    origin = get_settings().frontend_base_url
    resp = await client.get("/health", headers={"Origin": origin})
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == origin


async def test_cors_omits_header_for_other_origins(client: AsyncClient) -> None:
    resp = await client.get("/health", headers={"Origin": "http://evil.example.com"})
    assert resp.status_code == 200
    assert "access-control-allow-origin" not in resp.headers


async def test_cors_preflight_allows_configured_origin(client: AsyncClient) -> None:
    origin = get_settings().frontend_base_url
    resp = await client.options(
        "/notifications",
        headers={"Origin": origin, "Access-Control-Request-Method": "GET"},
    )
    assert resp.status_code == 200
    assert resp.headers.get("access-control-allow-origin") == origin
