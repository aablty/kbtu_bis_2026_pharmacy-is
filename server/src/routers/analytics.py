from typing import Annotated

from fastapi import APIRouter, Depends, Query

from src.models.enums import UserRole
from src.routers.deps import get_analytics_service, require_role
from src.schemas.analytics import (
    BestSellerResponse,
    LowStockMedicineResponse,
    RevenueReport,
)
from src.services.analytics_service import AnalyticsService

router = APIRouter(
    prefix="/analytics",
    tags=["analytics"],
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)

AnalyticsServiceDep = Annotated[AnalyticsService, Depends(get_analytics_service)]


@router.get("/best-sellers", response_model=list[BestSellerResponse])
async def best_sellers(
    service: AnalyticsServiceDep, limit: Annotated[int, Query(ge=1, le=100)] = 10
) -> list[BestSellerResponse]:
    return await service.best_sellers(limit)


@router.get("/low-stock", response_model=list[LowStockMedicineResponse])
async def low_stock(service: AnalyticsServiceDep) -> list[LowStockMedicineResponse]:
    medicines = await service.low_stock()
    return [LowStockMedicineResponse.model_validate(m) for m in medicines]


@router.get("/revenue", response_model=RevenueReport)
async def revenue(
    service: AnalyticsServiceDep, days: Annotated[int, Query(ge=1, le=365)] = 30
) -> RevenueReport:
    return await service.revenue(days)
