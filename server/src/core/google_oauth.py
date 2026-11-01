from dataclasses import dataclass

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from src.core.config import get_settings
from src.core.exceptions import GoogleTokenInvalidError

_google_request = google_requests.Request()


@dataclass(frozen=True)
class GoogleIdentity:
    sub: str
    email: str


def verify_google_id_token(token: str) -> GoogleIdentity:
    """Verifies a Google ID token's signature, audience, issuer, and
    expiry, and that Google itself has verified the holder's email.

    Blocking (does real network I/O to fetch/cache Google's public keys) -
    call via asyncio.to_thread from async code, same pattern as the
    Cloudinary SDK calls in core/file_storage.py.
    """
    client_id = get_settings().google_client_id
    if client_id is None:
        raise RuntimeError("GOOGLE_CLIENT_ID is not configured")

    try:
        claims = google_id_token.verify_oauth2_token(token, _google_request, client_id)
    except ValueError as exc:
        raise GoogleTokenInvalidError(str(exc)) from exc

    if not claims.get("email_verified", False):
        raise GoogleTokenInvalidError("Google account email is not verified")

    return GoogleIdentity(sub=claims["sub"], email=claims["email"])
