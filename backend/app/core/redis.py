import logging
from typing import Optional

import redis as redis_lib

from app.core.config import get_settings

logger = logging.getLogger("app.core.redis")

settings = get_settings()

_redis_client: Optional[redis_lib.Redis] = None


def get_redis() -> redis_lib.Redis:
    """Return the shared Redis client (lazily created)."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis_lib.Redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=3,
            socket_connect_timeout=3,
            health_check_interval=30,
        )
    return _redis_client


def ping_redis() -> bool:
    """Best-effort Redis reachability check used by the health endpoint."""
    try:
        return bool(get_redis().ping())
    except redis_lib.RedisError:
        return False
