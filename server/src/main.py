import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from src.core.windows_event_loop import use_selector_event_loop_on_windows

use_selector_event_loop_on_windows()

from src.core.scheduler import build_scheduler
from src.routers import (
    auth,
    categories,
    medicines,
    orders,
    prescriptions,
    sales,
    suppliers,
    users,
)

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

# Served when CLOUDINARY_URL isn't configured - LocalFileStorage writes
# prescription uploads here instead (see core/file_storage.py).
app.mount("/uploads", StaticFiles(directory="uploads", check_dir=False), name="uploads")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(suppliers.router)
app.include_router(categories.router)
app.include_router(medicines.router)
app.include_router(orders.router)
app.include_router(sales.router)
app.include_router(prescriptions.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
