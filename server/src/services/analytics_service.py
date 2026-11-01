from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.medicine import Medicine
from src.repositories.analytics_repository import AnalyticsRepository
from src.schemas.analytics import BestSellerResponse, RevenueDayResponse, RevenueReport


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

    async def revenue(self, days: int) -> RevenueReport:
        since = datetime.now(UTC) - timedelta(days=days)
        rows = await self._repo.daily_revenue(since)
        day_reports = [
            RevenueDayResponse(date=day, total_revenue=total) for day, total in rows
        ]
        total_revenue = sum((r.total_revenue for r in day_reports), start=Decimal(0))
        return RevenueReport(days=day_reports, total_revenue=total_revenue)
