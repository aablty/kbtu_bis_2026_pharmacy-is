import logging
from abc import ABC, abstractmethod

logger = logging.getLogger("pharmacy.email")


class EmailSender(ABC):
    @abstractmethod
    async def send(self, to: str, subject: str, body: str) -> None: ...


class ConsoleEmailSender(EmailSender):
    """Dev-only sender: logs the email instead of delivering it.

    Swapped for a real SMTP implementation in the infra phase - nothing
    above this class needs to change when that happens.
    """

    async def send(self, to: str, subject: str, body: str) -> None:
        logger.info(
            "=== EMAIL to=%s subject=%r ===\n%s\n=== END EMAIL ===", to, subject, body
        )


def get_email_sender() -> EmailSender:
    return ConsoleEmailSender()
