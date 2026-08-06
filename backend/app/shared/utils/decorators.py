import functools
import logging
import time
from typing import Any, Callable, TypeVar

logger = logging.getLogger("app.decorators")

F = TypeVar("F", bound=Callable[..., Any])


def log_execution(func: F) -> F:
    """Log execution time and exceptions for the decorated callable."""

    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        start = time.perf_counter()
        try:
            result = func(*args, **kwargs)
            logger.debug(
                "%s completed in %.2f ms",
                func.__qualname__,
                (time.perf_counter() - start) * 1000,
            )
            return result
        except Exception:
            logger.exception("Error in %s", func.__qualname__)
            raise

    return wrapper  # type: ignore[return-value]


def measure(metric: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """Decorator factory that logs timing under a named metric."""

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            start = time.perf_counter()
            try:
                return func(*args, **kwargs)
            finally:
                logger.debug("metric=%s duration_ms=%.2f", metric, (time.perf_counter() - start) * 1000)

        return wrapper

    return decorator
