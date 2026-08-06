import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.database import engine
from app.core.handlers import register_exception_handlers
from app.core.logging import setup_logging
from app.core.middleware import setup_middlewares
from app.infrastructure.statistics_updater import StatisticsUpdater
from app.presentation.api.router import api_router
from app.presentation.health import router as health_router

settings = get_settings()
logger = logging.getLogger("app.main")

_statistics_updater = StatisticsUpdater()


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("%s v%s starting (%s)", settings.APP_NAME, settings.APP_VERSION, settings.ENVIRONMENT)
    _statistics_updater.start()
    try:
        yield
    finally:
        _statistics_updater.stop()
        engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "Enterprise Business Intelligence Management System. "
            "Dashboards, KPIs, reports and analytics with JWT authentication."
        ),
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
        contact={
            "name": "Nova BI",
            "email": "admin@bisystem.dev",
        },
        license_info={
            "name": "Proprietary",
        },
    )

    setup_middlewares(app)
    register_exception_handlers(app)

    app.include_router(health_router, prefix=settings.API_V1_PREFIX)
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    @app.get("/", include_in_schema=False)
    def root() -> JSONResponse:
        return JSONResponse(
            content={
                "name": settings.APP_NAME,
                "version": settings.APP_VERSION,
                "environment": settings.ENVIRONMENT,
                "docs": "/api/docs",
                "openapi": "/api/openapi.json",
                "health": f"{settings.API_V1_PREFIX}/health",
            }
        )

    return app


app = create_app()
