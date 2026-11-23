from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from src.models.enums import PrescriptionStatus


class PrescriptionResponse(BaseModel):
    prescription_id: int
    customer_id: int
    # Populated for staff views (reviewers need to know whose prescription
    # this is) - never read from the ORM object directly, see the router.
    customer_name: str | None = None
    customer_email: str | None = None
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
