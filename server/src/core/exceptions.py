class DomainError(Exception):
    """Base class for business-rule violations the routers translate to HTTP errors."""


class EmailAlreadyRegisteredError(DomainError):
    pass


class InvalidCredentialsError(DomainError):
    pass


class EmailNotVerifiedError(DomainError):
    pass


class UserNotFoundError(DomainError):
    pass


class OtpCooldownError(DomainError):
    def __init__(self, retry_after_seconds: int) -> None:
        self.retry_after_seconds = retry_after_seconds
        super().__init__(f"Resend available in {retry_after_seconds}s")


class OtpInvalidError(DomainError):
    pass


class OtpExpiredError(DomainError):
    pass


class OtpLockedError(DomainError):
    pass


class InvalidTokenError(DomainError):
    pass


class CategoryNotFoundError(DomainError):
    pass


class CategoryCycleError(DomainError):
    pass


class SupplierNotFoundError(DomainError):
    pass


class MedicineNotFoundError(DomainError):
    pass


class EntityInUseError(DomainError):
    """Raised when a delete is blocked by a FK RESTRICT - something else still
    references this row (a category's children/medicines, a supplier's medicines)."""


class CategorySlugConflictError(DomainError):
    """Raised when two concurrent creates race on the same generated slug -
    the proactive uniqueness check can still lose a TOCTOU race under load."""


class CategoryNotLeafError(DomainError):
    """Raised when a medicine is assigned to a category that has subcategories -
    MEDICINES.category_id must always point at a leaf category."""
