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
    # Required only when at least one item's medicine requires a
    # prescription - validated against the customer's own approved
    # prescriptions in OrderService.place_order.
    prescription_id: int | None = None

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


class OrderStatusHistoryResponse(BaseModel):
    status: OrderStatus
    changed_at: datetime

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    order_id: int
    customer_id: int
    status: OrderStatus
    fulfillment_type: FulfillmentType
    delivery_address: str | None
    prescription_id: int | None
    total_amount: Decimal
    created_at: datetime
    items: list[OrderItemResponse]
    payment: PaymentResponse | None
    history: list[OrderStatusHistoryResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class OrderStatusUpdateRequest(BaseModel):
    status: OrderStatus
    # Required when completing an order gated behind prescription pickup
    # verification (order.prescription_id is set) - the code sent to the
    # customer's email once the order reached "ready".
    pickup_code: str | None = None
