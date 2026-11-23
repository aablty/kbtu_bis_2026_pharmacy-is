from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.medicine import Medicine
from src.repositories.analytics_repository import AnalyticsRepository
from src.schemas.analytics import (
    BestSellerResponse,
    ExpiringBatchResponse,
    RevenueDayResponse,
    RevenueReport,
    WastageItemResponse,
    WastageReport,
)


class AnalyticsService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = AnalyticsRepository(session)

    async def best_sellers(self, limit: int) -> list[BestSellerResponse]:
        rows = await self._repo.best_sellers(limit)
        return [
            BestSellerResponse(medicine_id=mid, medicine_name=name, units_sold=qty)
            for mid, name, qty in rows
        ]

    async def low_stock(self) -> list[Medicine]:
        return await self._repo.low_stock()

    async def expiring_batches(self, within_days: int) -> list[ExpiringBatchResponse]:
        rows = await self._repo.expiring_batches(within_days)
        return [
            ExpiringBatchResponse(
                batch_id=batch_id,
                medicine_id=medicine_id,
                medicine_name=name,
                expiry_date=expiry,
                quantity_remaining=remaining,
            )
            for batch_id, medicine_id, name, expiry, remaining in rows
        ]

    async def revenue(self, days: int) -> RevenueReport:
        since = datetime.now(UTC) - timedelta(days=days)
        rows = await self._repo.daily_revenue(since)
        day_reports = [
            RevenueDayResponse(date=day, total_revenue=total) for day, total in rows
        ]
        total_revenue = sum((r.total_revenue for r in day_reports), start=Decimal(0))
        return RevenueReport(days=day_reports, total_revenue=total_revenue)

    async def wastage(self, days: int | None) -> WastageReport:
        since = datetime.now(UTC) - timedelta(days=days) if days else None
        rows = await self._repo.wastage(since)
        items = [
            WastageItemResponse(
                medicine_id=mid, medicine_name=name, quantity=qty, value=val
            )
            for mid, name, qty, val in rows
        ]
        total_quantity = sum((i.quantity for i in items), start=0)
        total_value = sum((i.value for i in items), start=Decimal(0))
        return WastageReport(
            items=items, total_quantity=total_quantity, total_value=total_value
        )
