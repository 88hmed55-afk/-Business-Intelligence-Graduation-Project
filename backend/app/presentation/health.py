from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import text

from app.application.schemas.analytics import HealthResponse
from app.core.config import get_settings
from app.core.database import engine
from app.core.redis import ping_redis

router = APIRouter(tags=["System"])

settings = get_settings()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service health check",
    description="Reports the status of the application, database and Redis.",
)
def health_check() -> HealthResponse:
    checks: dict[str, str] = {}

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:  # noqa: BLE001 - report degraded instead of crashing
        checks["database"] = "error"

    checks["redis"] = "ok" if ping_redis() else "unreachable"

    status = "ok" if checks["database"] == "ok" else "degraded"

    return HealthResponse(
        status=status,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc).isoformat(),
        checks=checks,
    )
