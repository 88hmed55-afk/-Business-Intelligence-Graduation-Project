import html
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def sanitize_text(value: Any, max_length: int = 2_000) -> str:
    """Strip HTML/script content from user-provided text (XSS protection)."""
    if value is None:
        return ""
    text = str(value).strip()
    text = html.unescape(text)
    text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("javascript:", "").replace("onerror=", "").replace("onload=", "")
    return text[:max_length]


def slugify(value: str) -> str:
    """Convert an arbitrary string into a URL-safe slug."""
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-zA-Z0-9]+", "-", ascii_text.lower()).strip("-")


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def to_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    return str(value).strip().lower() in {"1", "true", "yes", "on", "y"}


def safe_round(value: Any, digits: int = 1) -> float:
    """Round a Decimal/float/None to a plain float, tolerating None."""
    if value is None:
        return 0.0
    try:
        return round(float(value), digits)
    except (TypeError, ValueError):
        return 0.0
