import logging
import time
import uuid
from typing import Awaitable, Callable

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response

from app.core.config import get_settings
from app.core.constants import CACHE_OVERVIEW_KEY
from app.core.redis import get_redis

logger = logging.getLogger("app.middleware")

_SYNC_EXCLUDED_PREFIXES = ("/auth/", "/business/reports/export")


def _app_path(path: str) -> str:
    """Strip the API router prefix so middleware can match route-level paths."""
    api_prefix = get_settings().API_V1_PREFIX
    if api_prefix and path.startswith(api_prefix):
        return path[len(api_prefix):]
    return path


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Assigns a request ID and logs request timing for every request."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        request.state.request_id = request_id

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time-Ms"] = f"{duration_ms:.2f}"

        logger.info(
            "%s %s -> %s (%.2f ms) request_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request_id,
        )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Token-bucket style per-IP rate limiting backed by Redis.

    Disabled unless ``ENABLE_RATE_LIMITING`` is true. When Redis is
    unreachable the middleware degrades to a no-op so the API stays up.
    """

    def __init__(
        self,
        app,
        *,
        max_requests: int,
        window_seconds: int,
    ) -> None:
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if request.url.path.startswith(("/api/docs", "/api/redoc", "/api/openapi.json")):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        key = f"rate:{client_ip}:{int(time.time()) // self.window_seconds}"

        try:
            redis = get_redis()
            count = redis.incr(key)
            if count == 1:
                redis.expire(key, self.window_seconds + 1)
            if count > self.max_requests:
                return JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "error": {
                            "code": "RATE_LIMITED",
                            "message": "Too many requests. Please try again later.",
                        }
                    },
                )
        except Exception:  # noqa: BLE001 - degrade gracefully when Redis is unavailable
            logger.warning("Rate limiter unavailable, skipping limit for %s", client_ip)

        response = await call_next(request)
        response.headers["X-RateLimit-Remaining"] = str(max(self.max_requests - int(response.headers.get("X-RateLimit-Count", 1)), 0))
        return response


class CacheInvalidationMiddleware(BaseHTTPMiddleware):
    """Invalidates derived analytic caches after any successful mutating request.

    Keeps the Redis-cached commerce overview consistent with committed data:
    by the time the response reaches the client the cache is already cleared,
    so the next dashboard/analytics read recomputes fresh values. Best-effort:
    if Redis is unreachable the request is not affected.
    """

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        if (
            request.method in {"POST", "PUT", "PATCH", "DELETE"}
            and response.status_code < 400
            and not _app_path(request.url.path).startswith(_SYNC_EXCLUDED_PREFIXES)
        ):
            try:
                get_redis().delete(CACHE_OVERVIEW_KEY)
            except Exception:  # noqa: BLE001 - cache invalidation is best-effort
                logger.warning("Overview cache invalidation failed", exc_info=True)
        return response


def setup_middlewares(app: FastAPI) -> None:
    settings = get_settings()

    # Innermost: exception handling is done via app-level handlers in main.py.
    # Order below means CORS is the outermost middleware (registered last).
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(CacheInvalidationMiddleware)
    if settings.ENABLE_RATE_LIMITING:
        app.add_middleware(
            RateLimitMiddleware,
            max_requests=settings.RATE_LIMIT_REQUESTS,
            window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS,
        )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
