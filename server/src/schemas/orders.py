from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from src.models.enums import FulfillmentType, OrderStatus, PaymentMethod, PaymentStatus


class OrderItemCreate(BaseModel):
    medicine_id: int
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    items: list[OrderItemCreate] = Field(min_length=1)
    fulfillment_type: FulfillmentType
    delivery_address: str | None = Field(default=None, max_length=255)
    payment_method: PaymentMethod

    @model_validator(mode="after")
    def _delivery_requires_address(self) -> OrderCreate:
        if (
            self.fulfillment_type == FulfillmentType.DELIVERY
            and not self.delivery_address
        ):
            raise ValueError(
                "delivery_address is required when fulfillment_type is delivery"
            )
        return self


class OrderItemResponse(BaseModel):
    medicine_id: int
    medicine_name: str
    quantity: int
    unit_price: Decimal

    model_config = {"from_attributes": True}


class PaymentResponse(BaseModel):
    method: PaymentMethod
    status: PaymentStatus
    amount: Decimal
    paid_at: datetime | None

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    order_id: int
    customer_id: int
    status: OrderStatus
    fulfillment_type: FulfillmentType
    delivery_address: str | None
    total_amount: Decimal
    created_at: datetime
    items: list[OrderItemResponse]
    payment: PaymentResponse | None

    model_config = {"from_attributes": True}


class OrderStatusUpdateRequest(BaseModel):
    status: OrderStatus
