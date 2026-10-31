from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from src.models.enums import PrescriptionStatus


class PrescriptionResponse(BaseModel):
    prescription_id: int
    customer_id: int
    file_url: str
    status: PrescriptionStatus
    reviewed_by: int | None
    reviewed_at: datetime | None
    rejection_reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PrescriptionReviewRequest(BaseModel):
    approve: bool
    reason: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def _reason_required_on_reject(self) -> PrescriptionReviewRequest:
        if not self.approve and not self.reason:
            raise ValueError("reason is required when rejecting a prescription")
        return self
