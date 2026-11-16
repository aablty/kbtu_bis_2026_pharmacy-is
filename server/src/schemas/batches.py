from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


class BatchCreate(BaseModel):
    medicine_id: int
    supplier_id: int
    quantity: int = Field(gt=0)
    expiry_date: date

    @field_validator("expiry_date")
    @classmethod
    def expiry_date_not_in_past(cls, value: date) -> date:
        if value < date.today():
            raise ValueError("expiry_date cannot be in the past")
        return value


class BatchResponse(BaseModel):
    batch_id: int
    medicine_id: int
    supplier_id: int
    quantity_received: int
    quantity_remaining: int
    expiry_date: date
    barcode: str | None
    received_at: datetime

    model_config = {"from_attributes": True}


class BatchByBarcodeResponse(BaseModel):
    batch_id: int
    medicine_id: int
    medicine_name: str
    quantity_remaining: int
    expiry_date: date
    barcode: str | None
