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
