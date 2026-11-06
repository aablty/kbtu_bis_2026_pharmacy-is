import base64
import json


def encode_cursor(name: str, medicine_id: int) -> str:
    raw = json.dumps([name, medicine_id]).encode()
    return base64.urlsafe_b64encode(raw).decode()


def decode_cursor(cursor: str) -> tuple[str, int]:
    """Raises ValueError on anything that is not a cursor we issued."""
    try:
        name, medicine_id = json.loads(base64.urlsafe_b64decode(cursor.encode()))
        if not isinstance(name, str) or not isinstance(medicine_id, int):
            raise TypeError
    except ValueError, TypeError:
        raise ValueError("Invalid cursor") from None
    return name, medicine_id
