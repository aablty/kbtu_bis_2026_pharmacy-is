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
