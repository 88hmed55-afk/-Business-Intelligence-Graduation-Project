from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standard API envelope."""

    success: bool = True
    data: T | None = None
    message: str = "Success"


class MessageResponse(BaseModel):
    success: bool = True
    message: str


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int
