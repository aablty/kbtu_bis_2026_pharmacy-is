import pytest

from src.core.email import ConsoleEmailSender, SmtpEmailSender, get_email_sender


class _FakeSettings:
    def __init__(
        self,
        *,
        smtp_host: str | None = None,
        smtp_username: str | None = None,
        smtp_password: str | None = None,
        smtp_port: int = 587,
    ) -> None:
        self.smtp_host = smtp_host
        self.smtp_username = smtp_username
        self.smtp_password = smtp_password
        self.smtp_port = smtp_port


def test_get_email_sender_falls_back_to_console_without_smtp_host(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("src.core.email.get_settings", lambda: _FakeSettings())
    assert isinstance(get_email_sender(), ConsoleEmailSender)


def test_get_email_sender_returns_smtp_sender_when_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "src.core.email.get_settings",
        lambda: _FakeSettings(
            smtp_host="smtp.gmail.com",
            smtp_username="a@example.com",
            smtp_password="secret",
        ),
    )
    assert isinstance(get_email_sender(), SmtpEmailSender)


def test_smtp_email_sender_requires_username_and_password(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "src.core.email.get_settings",
        lambda: _FakeSettings(smtp_host="smtp.gmail.com"),
    )
    with pytest.raises(RuntimeError):
        SmtpEmailSender()


def test_smtp_email_sender_requires_host(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("src.core.email.get_settings", lambda: _FakeSettings())
    with pytest.raises(RuntimeError):
        SmtpEmailSender()
