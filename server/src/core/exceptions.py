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


class OrderNotFoundError(DomainError):
    pass


class InsufficientStockError(DomainError):
    def __init__(self, medicine_id: int) -> None:
        self.medicine_id = medicine_id
        super().__init__(f"Insufficient stock for medicine {medicine_id}")


class InvalidOrderStatusTransitionError(DomainError):
    def __init__(self, from_status: str, to_status: str) -> None:
        self.from_status = from_status
        self.to_status = to_status
        super().__init__(f"Cannot move an order from {from_status} to {to_status}")


class IdempotencyKeyConflictError(DomainError):
    """Raised when an Idempotency-Key is reused across two different customers -
    a genuine key collision, not a safe-to-replay retry of the same customer's
    own request. Also what a concurrent-create race on the same key resolves
    to, if the winning order turns out to belong to someone else."""

    def __init__(self, idempotency_key: str) -> None:
        self.idempotency_key = idempotency_key
        super().__init__(
            f"Idempotency key already used by a different order: {idempotency_key}"
        )


class SaleNotFoundError(DomainError):
    pass


class StockVersionConflictError(DomainError):
    """Raised by the optimistic-locking stock decrement when another write
    touched this medicine between the read and this attempt - distinct from
    InsufficientStockError so the caller (cashier/UI) knows to just retry,
    not to tell the customer the item is out of stock."""

    def __init__(self, medicine_id: int) -> None:
        self.medicine_id = medicine_id
        super().__init__(f"Medicine {medicine_id} was updated concurrently, retry")


class InvalidSaleCustomerError(DomainError):
    """Raised when a sale's customer_id points at a real user who isn't a
    CUSTOMER - e.g. a staff account - rather than at a nonexistent user."""

    def __init__(self, user_id: int) -> None:
        self.user_id = user_id
        super().__init__(f"User {user_id} is not a customer")
