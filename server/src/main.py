import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.core.windows_event_loop import use_selector_event_loop_on_windows

use_selector_event_loop_on_windows()

from src.core.config import get_settings
from src.core.scheduler import build_scheduler
from src.routers import (
    analytics,
    auth,
    categories,
    medicines,
    notifications,
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

# Single configured origin, not "*" - allow_credentials requires a specific
# origin, and this app sends the JWT via the Authorization header (no
# cookies), so credentials aren't strictly needed either, but a wildcard
# would also defeat the point of restricting this at all.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[get_settings().frontend_base_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
app.include_router(notifications.router)
app.include_router(analytics.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
