from enum import StrEnum


class UserRole(StrEnum):
    ADMIN = "admin"
    PHARMACIST = "pharmacist"
    CASHIER = "cashier"
    CUSTOMER = "customer"


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


class PrescriptionStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class NotificationType(StrEnum):
    LOW_STOCK = "low_stock"
    ORDER_STATUS = "order_status"
    PRESCRIPTION_STATUS = "prescription_status"


class DosageForm(StrEnum):
    AMPOULES = "ampoules"
    AEROSOL = "aerosol"
    BALM = "balm"
    GEL = "gel"
    GRANULES = "granules"
    DRAGEE = "dragee"
    CHEWING_GUM = "chewing_gum"
    DROPS = "drops"
    CAPSULES = "capsules"
    VAGINAL_CAPSULES = "vaginal_capsules"
    PENCIL = "pencil"
    CONCENTRATE = "concentrate"
    CREAM = "cream"
    LACQUER = "lacquer"
    LOZENGES = "lozenges"
    LOTION = "lotion"
    OINTMENT = "ointment"
    OIL = "oil"
    TINCTURE = "tincture"
    PASTE = "paste"
    PASTILLES = "pastilles"
    STRIP = "strip"
    PATCH = "patch"
    DISPERSIBLE_FILM = "dispersible_film"
    POWDER = "powder"
    SOLUTION = "solution"
    SACHET = "sachet"
    SYRUP = "syrup"
    SPIRAL = "spiral"
    SPRAY = "spray"
    SUPPOSITORIES = "suppositories"
    SUSPENSION = "suspension"
    TABLETS = "tablets"
    VAGINAL_TABLETS = "vaginal_tablets"
    VIAL = "vial"
    SHAMPOO = "shampoo"
    EFFERVESCENT_TABLETS = "effervescent_tablets"
    SYRINGE = "syringe"
    EMULSION = "emulsion"


DOSAGE_FORM_BY_RU: dict[str, DosageForm] = {
    "ампулы": DosageForm.AMPOULES,
    "аэрозоль": DosageForm.AEROSOL,
    "бальзам": DosageForm.BALM,
    "гель": DosageForm.GEL,
    "гранулы": DosageForm.GRANULES,
    "драже": DosageForm.DRAGEE,
    "жевательная резинка": DosageForm.CHEWING_GUM,
    "капли": DosageForm.DROPS,
    "капсулы": DosageForm.CAPSULES,
    "капсулы вагинальные": DosageForm.VAGINAL_CAPSULES,
    "карандаш": DosageForm.PENCIL,
    "концентрат": DosageForm.CONCENTRATE,
    "крем": DosageForm.CREAM,
    "лак": DosageForm.LACQUER,
    "леденцы": DosageForm.LOZENGES,
    "лосьон": DosageForm.LOTION,
    "мазь": DosageForm.OINTMENT,
    "масло": DosageForm.OIL,
    "настойка": DosageForm.TINCTURE,
    "паста": DosageForm.PASTE,
    "пастилки": DosageForm.PASTILLES,
    "пластинка": DosageForm.STRIP,
    "пластырь": DosageForm.PATCH,
    "пленка диспергируемая": DosageForm.DISPERSIBLE_FILM,
    "порошок": DosageForm.POWDER,
    "раствор": DosageForm.SOLUTION,
    "саше": DosageForm.SACHET,
    "сироп": DosageForm.SYRUP,
    "спираль": DosageForm.SPIRAL,
    "спрей": DosageForm.SPRAY,
    "суппозитории": DosageForm.SUPPOSITORIES,
    "суспензия": DosageForm.SUSPENSION,
    "таблетки": DosageForm.TABLETS,
    "таблетки вагинальные": DosageForm.VAGINAL_TABLETS,
    "флакон": DosageForm.VIAL,
    "шампунь": DosageForm.SHAMPOO,
    "шипучие таблетки": DosageForm.EFFERVESCENT_TABLETS,
    "шприц": DosageForm.SYRINGE,
    "эмульсия": DosageForm.EMULSION,
}
