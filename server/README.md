# Pharmacy IS — Backend

FastAPI backend for the Pharmacy Information System. See the architecture plan for
full context on scope and sequencing.

## Setup

```bash
uv sync
cp .env.example .env   # fill in DATABASE_URL (ask the team for the Neon dev-branch URL)
uv run alembic upgrade head
```

## Running locally

```bash
uv run python run_dev.py
```

Not `uvicorn src.main:app` directly - on Windows, psycopg's async driver needs the
`SelectorEventLoop`, and uvicorn's own startup creates the event loop before our
app code runs, too late to switch it. `run_dev.py` sets the policy first. See
`src/core/windows_event_loop.py`.

Server comes up on `http://localhost:8000`. `GET /health` for a liveness check;
`/docs` for the interactive OpenAPI UI.

In dev, OTP codes (registration/password reset) are logged to the console instead
of emailed — look for `=== EMAIL to=... ===` blocks in the server output.

## Tests

```bash
uv run pytest
```

Tests run against the same database as `DATABASE_URL` (the Neon dev branch), each
wrapped in a transaction that's rolled back afterward — safe to run repeatedly
without leaving data behind.

## Migrations

```bash
uv run alembic revision --autogenerate -m "describe the change"
uv run alembic upgrade head
```

## Lint

```bash
uv run ruff check src tests
uv run ruff format src tests
```
