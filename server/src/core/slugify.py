import re

_NON_SLUG_CHARS = re.compile(r"[^a-z0-9]+")


def slugify(text: str) -> str:
    slug = _NON_SLUG_CHARS.sub("-", text.strip().lower()).strip("-")
    return slug or "category"
