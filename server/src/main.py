import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from src.core.windows_event_loop import use_selector_event_loop_on_windows

use_selector_event_loop_on_windows()

from src.core.scheduler import build_scheduler
from src.routers import auth, categories, medicines, orders, sales, suppliers, users

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    scheduler = build_scheduler()
    scheduler.start()
    try:
        yield
    finally:
        scheduler.shutdown()


app = FastAPI(title="Pharmacy IS API", lifespan=lifespan)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(suppliers.router)
app.include_router(categories.router)
app.include_router(medicines.router)
app.include_router(orders.router)
app.include_router(sales.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
