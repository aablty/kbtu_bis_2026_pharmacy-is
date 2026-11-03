import json
from collections.abc import Callable
from typing import Any

import httpx
import pytest

from src.core.email import (
    ResendEmailSender,
    SmtpEmailSender,
    get_email_sender,
)


class _FakeSettings:
    def __init__(
        self,
        *,
        smtp_host: str | None = None,
        smtp_username: str | None = None,
        smtp_password: str | None = None,
        smtp_port: int = 587,
        resend_api_key: str | None = None,
        resend_from_email: str | None = "noreply@example.com",
        resend_from_name: str = "PillPoint",
    ) -> None:
        self.smtp_host = smtp_host
        self.smtp_username = smtp_username
        self.smtp_password = smtp_password
        self.smtp_port = smtp_port
        self.resend_api_key = resend_api_key
        self.resend_from_email = resend_from_email
        self.resend_from_name = resend_from_name


def _mock_http(
    monkeypatch: pytest.MonkeyPatch,
    handler: Callable[[httpx.Request], httpx.Response],
) -> None:
    real_client = httpx.AsyncClient

    def _client(**kwargs: Any) -> httpx.AsyncClient:
        return real_client(transport=httpx.MockTransport(handler), **kwargs)

    monkeypatch.setattr("src.core.email.httpx.AsyncClient", _client)


def test_get_email_sender_prefers_resend_when_api_key_set(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "src.core.email.get_settings",
        lambda: _FakeSettings(
            resend_api_key="re_test",
            smtp_host="smtp.gmail.com",
            smtp_username="a@example.com",
            smtp_password="secret",
        ),
    )
    assert isinstance(get_email_sender(), ResendEmailSender)


async def test_resend_sender_posts_expected_payload(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return httpx.Response(200, json={"id": "email_1"})

    _mock_http(monkeypatch, handler)
    sender = ResendEmailSender("re_test", "noreply@example.com", "PillPoint")

    await sender.send("user@example.com", "Verify your email", "Code 123456 <b>")

    assert len(captured) == 1
    request = captured[0]
    assert str(request.url) == "https://api.resend.com/emails"
    assert request.headers["Authorization"] == "Bearer re_test"
    payload = json.loads(request.content)
    assert payload["from"] == "PillPoint <noreply@example.com>"
    assert payload["to"] == ["user@example.com"]
    assert payload["subject"] == "Verify your email"
    assert "<h2" in payload["html"]
    assert "Verify your email</h2>" in payload["html"]
    assert "Code 123456 &lt;b&gt;" in payload["html"]
    assert "<b>" not in payload["html"]


async def test_resend_sender_escapes_subject(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request)
        return httpx.Response(200, json={"id": "email_2"})

    _mock_http(monkeypatch, handler)
    sender = ResendEmailSender("re_test", "noreply@example.com", "PillPoint")

    await sender.send("user@example.com", "<img src=x>", "Code 123456")

    payload = json.loads(captured[0].content)
    assert "<img src=x>" not in payload["html"]
    assert "&lt;img src=x&gt;" in payload["html"]


async def test_resend_sender_raises_on_error_status(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _mock_http(
        monkeypatch,
        lambda request: httpx.Response(422, json={"message": "invalid from"}),
    )
    sender = ResendEmailSender("re_test", "bad", "PillPoint")

    with pytest.raises(httpx.HTTPStatusError):
        await sender.send("user@example.com", "Subject", "Body")


def test_get_email_sender_fails_when_no_transport_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("src.core.email.get_settings", lambda: _FakeSettings())
    with pytest.raises(RuntimeError):
        get_email_sender()


def test_get_email_sender_fails_when_resend_has_no_from_address(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "src.core.email.get_settings",
        lambda: _FakeSettings(resend_api_key="re_test", resend_from_email=None),
    )
    with pytest.raises(RuntimeError):
        get_email_sender()


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
