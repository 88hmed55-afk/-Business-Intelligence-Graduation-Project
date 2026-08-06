import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import AppError

logger = logging.getLogger("app.handlers")


def _error_response(status_code: int, code: str, message: str, details=None) -> JSONResponse:
    payload: dict = {"success": False, "error": {"code": code, "message": message}}
    if details is not None:
        payload["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=payload)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return _error_response(exc.status_code, exc.code, exc.message, exc.details)


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return _error_response(422, "VALIDATION_ERROR", "Request validation failed", exc.errors())


async def http_error_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return _error_response(exc.status_code, "HTTP_ERROR", str(exc.detail))


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return _error_response(500, "INTERNAL_ERROR", "An unexpected error occurred.")


async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    pg_code = getattr(getattr(exc, "orig", None), "sqlstate", None)
    if pg_code == "23505":  # unique_violation
        return _error_response(409, "CONFLICT", "A record with these details already exists.")
    if pg_code == "23502":  # not_null_violation
        return _error_response(400, "BAD_REQUEST", "A required field is missing.")
    if pg_code == "23503":  # foreign_key_violation
        return _error_response(400, "BAD_REQUEST", "The referenced record does not exist or is in use.")
    logger.exception("Integrity error on %s %s", request.method, request.url.path)
    return _error_response(500, "INTERNAL_ERROR", "An unexpected error occurred.")


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_error_handler)
    app.add_exception_handler(IntegrityError, integrity_error_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
