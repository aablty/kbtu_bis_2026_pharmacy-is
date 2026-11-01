import asyncio
import logging
import os
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

from src.core.config import get_settings

logger = logging.getLogger("pharmacy.file_storage")

_CLOUDINARY_PRESCRIPTIONS_FOLDER = "prescriptions"


def _cloudinary_folder(base: str) -> str:
    """Suffixes the folder with `_test` during a pytest run, checked at
    call time (not import time, since pytest only sets this once a test
    actually starts) - there's no paid Cloudinary plan here for a separate
    dev/prod environment, so this is what keeps automated-test uploads out
    of the same folder real/manual ones land in."""
    if "PYTEST_CURRENT_TEST" in os.environ:
        return f"{base}_test"
    return base


@dataclass(frozen=True)
class CloudinaryCredentials:
    cloud_name: str | None
    api_key: str | None
    api_secret: str | None


def parse_cloudinary_url(url: str) -> CloudinaryCredentials:
    """Extracts cloud_name/api_key/api_secret from a cloudinary://... URL.

    cloudinary.config(cloudinary_url=...) does NOT parse the URL - the SDK
    only parses CLOUDINARY_URL from a real environment variable, read once
    when its config singleton is first constructed (at import time, before
    pydantic-settings ever loads server/.env into os.environ). This is what
    the SDK does internally for that env-var path; CloudinaryFileStorage
    calls it explicitly instead.
    """
    parsed = urlparse(url)
    return CloudinaryCredentials(
        cloud_name=parsed.hostname, api_key=parsed.username, api_secret=parsed.password
    )


class FileStorage(ABC):
    @abstractmethod
    async def upload(self, content: bytes, filename: str, content_type: str) -> str:
        """Stores the file and returns a publicly reachable URL."""


class LocalFileStorage(FileStorage):
    """Dev fallback: writes to a local directory, served via a static mount.

    Swapped for CloudinaryFileStorage once CLOUDINARY_URL is configured -
    nothing above this class needs to change when that happens.
    """

    _UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "prescriptions"

    def __init__(self) -> None:
        self._UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    async def upload(self, content: bytes, filename: str, content_type: str) -> str:
        stored_name = f"{uuid.uuid4().hex}{Path(filename).suffix}"
        (self._UPLOAD_DIR / stored_name).write_bytes(content)
        logger.info("=== FILE STORED locally: %s ===", stored_name)
        return f"/uploads/prescriptions/{stored_name}"


class CloudinaryFileStorage(FileStorage):
    def __init__(self) -> None:
        import cloudinary

        cloudinary_url = get_settings().cloudinary_url
        if cloudinary_url is None:
            # get_file_storage() only constructs this class when
            # CLOUDINARY_URL is set - this guards against direct
            # construction bypassing that check.
            raise RuntimeError(
                "CloudinaryFileStorage requires CLOUDINARY_URL to be set"
            )
        credentials = parse_cloudinary_url(cloudinary_url)
        cloudinary.config(
            cloud_name=credentials.cloud_name,
            api_key=credentials.api_key,
            api_secret=credentials.api_secret,
        )

    async def upload(self, content: bytes, filename: str, content_type: str) -> str:
        import cloudinary.uploader

        def _upload() -> str:
            # Explicit timeout - an unbounded call here would hang the
            # request (and, in tests, the whole suite) if Cloudinary is
            # ever slow or unreachable.
            result = cloudinary.uploader.upload(
                content,
                resource_type="auto",
                folder=_cloudinary_folder(_CLOUDINARY_PRESCRIPTIONS_FOLDER),
                timeout=10,
            )
            return str(result["secure_url"])

        return await asyncio.to_thread(_upload)


@lru_cache
def get_file_storage() -> FileStorage:
    # Cached (settings never change at runtime) - CloudinaryFileStorage's
    # __init__ parses the URL and writes to cloudinary's process-global
    # config singleton, which is wasted work worth doing once, not per request.
    if get_settings().cloudinary_url:
        return CloudinaryFileStorage()
    return LocalFileStorage()
