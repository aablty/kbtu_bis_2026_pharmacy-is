import asyncio
import sys


def use_selector_event_loop_on_windows() -> None:
    """psycopg's async driver cannot run on Windows' default ProactorEventLoop -
    it needs SelectorEventLoop. Must run before any event loop is created."""
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())  # ty: ignore[deprecated]
