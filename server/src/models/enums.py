from enum import StrEnum


class UserRole(StrEnum):
    ADMIN = "admin"
    PHARMACIST = "pharmacist"
    CASHIER = "cashier"
    CUSTOMER = "customer"


class Locale(StrEnum):
    EN = "en"
    RU = "ru"
    KK = "kk"


class OtpPurpose(StrEnum):
    EMAIL_VERIFICATION = "email_verification"
    PASSWORD_RESET = "password_reset"
    ORDER_PICKUP = "order_pickup"


class OrderStatus(StrEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    READY = "ready"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class FulfillmentType(StrEnum):
    PICKUP = "pickup"
    DELIVERY = "delivery"


class PaymentMethod(StrEnum):
    CASH = "cash"
    CARD_SIMULATED = "card_simulated"


class PaymentStatus(StrEnum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"
