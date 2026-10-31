from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class SaleItemCreate(BaseModel):
    medicine_id: int
    quantity: int = Field(gt=0)


class SaleCreate(BaseModel):
    items: list[SaleItemCreate] = Field(min_length=1)
    customer_id: int | None = None


class SaleItemResponse(BaseModel):
    medicine_id: int
    medicine_name: str
    quantity: int
    unit_price: Decimal

    model_config = {"from_attributes": True}


class SaleResponse(BaseModel):
    sale_id: int
    order_id: int | None
    customer_id: int | None
    employee_id: int
    total_amount: Decimal
    created_at: datetime
    items: list[SaleItemResponse]

    model_config = {"from_attributes": True}
