from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class BestSellerResponse(BaseModel):
    medicine_id: int
    medicine_name: str
    units_sold: int


class LowStockMedicineResponse(BaseModel):
    medicine_id: int
    name: str
    stock_quantity: int
    reorder_threshold: int

    model_config = {"from_attributes": True}


class RevenueDayResponse(BaseModel):
    date: date
    total_revenue: Decimal


class RevenueReport(BaseModel):
    days: list[RevenueDayResponse]
    total_revenue: Decimal
