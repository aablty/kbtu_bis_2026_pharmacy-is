import logging
from abc import ABC, abstractmethod
from pathlib import Path

from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

from src.core.config import get_settings

logger = logging.getLogger("pharmacy.email")

_TEMPLATE_FOLDER = Path(__file__).resolve().parents[1] / "templates"


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


class SmtpEmailSender(EmailSender):
    """Real delivery via fastapi-mail (aiosmtplib under the hood - genuinely
    async, no thread pool needed). STARTTLS on port 587 is Gmail's own
    pattern (smtp.gmail.com), with an App Password as SMTP_PASSWORD - Gmail
    has required one of those instead of the account password for
    third-party SMTP clients for years now, since "less secure apps"
    access was retired. Renders every message through email_base.html
    (Jinja2, via fastapi-mail's TEMPLATE_FOLDER), which just wraps the
    plain-text subject/body OtpService already builds in a basic styled
    shell - the OTP purposes don't need bespoke per-purpose templates."""

    def __init__(self) -> None:
        settings = get_settings()
        if settings.smtp_host is None:
            # get_email_sender() only constructs this class when SMTP_HOST
            # is set - this guards against direct construction bypassing
            # that check, same pattern as CloudinaryFileStorage.
            raise RuntimeError("SMTP_HOST is not configured")
        if settings.smtp_username is None or settings.smtp_password is None:
            raise RuntimeError("SMTP_USERNAME and SMTP_PASSWORD must both be set")

        config = ConnectionConfig(
            MAIL_USERNAME=settings.smtp_username,
            MAIL_PASSWORD=settings.smtp_password,
            MAIL_FROM=settings.smtp_username,
            MAIL_PORT=settings.smtp_port,
            MAIL_SERVER=settings.smtp_host,
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
            TEMPLATE_FOLDER=_TEMPLATE_FOLDER,
        )
        self._fm = FastMail(config)

    async def send(self, to: str, subject: str, body: str) -> None:
        message = MessageSchema(
            subject=subject,
            recipients=[to],
            template_body={"subject": subject, "body": body},
            subtype=MessageType.html,
        )
        await self._fm.send_message(message, template_name="email_base.html")


def get_email_sender() -> EmailSender:
    if get_settings().smtp_host:
        return SmtpEmailSender()
    return ConsoleEmailSender()
