from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.exceptions import (
    FileTooLargeError,
    InvalidFileTypeError,
    PrescriptionAlreadyReviewedError,
    PrescriptionNotFoundError,
)
from src.core.file_storage import FileStorage
from src.models.enums import PrescriptionStatus
from src.models.prescription import Prescription
from src.repositories.prescription_repository import PrescriptionRepository

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "application/pdf"}
# Public (no leading underscore) - the router reads at most this many bytes
# + 1 so an oversized upload is rejected without ever buffering it in full.
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


class PrescriptionService:
    def __init__(self, session: AsyncSession, file_storage: FileStorage) -> None:
        self._session = session
        self._repo = PrescriptionRepository(session)
        self._storage = file_storage

    async def upload(
        self, customer_id: int, filename: str, content_type: str, content: bytes
    ) -> Prescription:
        if content_type not in _ALLOWED_CONTENT_TYPES:
            raise InvalidFileTypeError(content_type)
        if len(content) > MAX_FILE_SIZE_BYTES:
            raise FileTooLargeError()

        file_url = await self._storage.upload(content, filename, content_type)
        prescription = Prescription(customer_id=customer_id, file_url=file_url)
        self._repo.add(prescription)
        await self._session.commit()
        return prescription

    async def get(self, prescription_id: int) -> Prescription:
        prescription = await self._repo.get_by_id(prescription_id)
        if prescription is None:
            raise PrescriptionNotFoundError(prescription_id)
        return prescription

    async def list_for_customer(self, customer_id: int) -> list[Prescription]:
        return await self._repo.list_for_customer(customer_id)

    async def list_all(self) -> list[Prescription]:
        return await self._repo.list_all()

    async def review(
        self, prescription_id: int, reviewer_id: int, approve: bool, reason: str | None
    ) -> Prescription:
        prescription = await self.get(prescription_id)
        if prescription.status != PrescriptionStatus.PENDING:
            raise PrescriptionAlreadyReviewedError(
                f"Prescription {prescription_id} was already reviewed"
            )

        prescription.status = (
            PrescriptionStatus.APPROVED if approve else PrescriptionStatus.REJECTED
        )
        prescription.reviewed_by = reviewer_id
        prescription.reviewed_at = datetime.now(UTC)
        prescription.rejection_reason = None if approve else reason
        await self._session.commit()
        return prescription
