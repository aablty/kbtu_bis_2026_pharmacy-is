from datetime import UTC, datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.enums import OtpPurpose
from src.models.otp import OtpCode


class OtpRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, otp: OtpCode) -> None:
        self._session.add(otp)

    async def get_latest_active(
        self,
        purpose: OtpPurpose,
        destination: str,
        *,
        order_id: int | None = None,
    ) -> OtpCode | None:
        # order_id narrows the lookup to one specific order's code - needed
        # for order_pickup, where the same customer can have several orders
        # ready for pickup at once, each with its own code. The other two
        # purposes never pass it, so destination alone stays their key.
        conditions = [
            OtpCode.purpose == purpose,
            OtpCode.destination == destination,
            OtpCode.consumed_at.is_(None),
        ]
        if order_id is not None:
            conditions.append(OtpCode.order_id == order_id)
        result = await self._session.execute(
            select(OtpCode)
            .where(*conditions)
            .order_by(OtpCode.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, otp_id: int) -> OtpCode | None:
        return await self._session.get(OtpCode, otp_id)

    async def delete_expired_or_consumed(self, now: datetime | None = None) -> int:
        now = now or datetime.now(UTC)
        result = await self._session.execute(
            delete(OtpCode).where(
                (OtpCode.expires_at < now) | (OtpCode.consumed_at.is_not(None))
            )
        )
        return result.rowcount or 0  # ty: ignore[unresolved-attribute]
