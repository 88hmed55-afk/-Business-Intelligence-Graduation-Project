from typing import Any, Optional


class AppError(Exception):
    """Base class for all domain/application errors."""

    status_code: int = 500
    code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred."

    def __init__(self, message: Optional[str] = None, *, details: Any = None) -> None:
        self.message = message or self.message
        self.details = details
        super().__init__(self.message)


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"
    message = "Resource not found."


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"
    message = "Resource already exists."


class UnauthorizedError(AppError):
    status_code = 401
    code = "UNAUTHORIZED"
    message = "Authentication required."


class ForbiddenError(AppError):
    status_code = 403
    code = "FORBIDDEN"
    message = "You do not have permission to perform this action."


class BadRequestError(AppError):
    status_code = 400
    code = "BAD_REQUEST"
    message = "Invalid request."
