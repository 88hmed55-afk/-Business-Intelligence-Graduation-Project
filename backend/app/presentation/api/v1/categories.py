import uuid

from fastapi import APIRouter, Depends, Query

from app.application.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate
from app.application.schemas.common import ApiResponse, MessageResponse, PaginatedResponse
from app.application.services.category_service import CategoryService
from app.domain.entities.user import User
from app.presentation.deps import get_category_service, get_current_user, require_permission
from app.shared.utils.response import paginate

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[CategoryOut]],
    summary="List categories",
)
def list_categories(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    parent_id: uuid.UUID | None = Query(None),
    current_user: User = Depends(get_current_user),
    service: CategoryService = Depends(get_category_service),
) -> ApiResponse[PaginatedResponse[CategoryOut]]:
    categories, total = service.list(page, page_size, search, parent_id)
    return ApiResponse(data=paginate([CategoryOut.model_validate(c) for c in categories], total, page, page_size))


@router.post(
    "",
    response_model=ApiResponse[CategoryOut],
    status_code=201,
    summary="Create category",
)
def create_category(
    payload: CategoryCreate,
    current_user: User = Depends(require_permission("products", "create")),
    service: CategoryService = Depends(get_category_service),
) -> ApiResponse[CategoryOut]:
    category = service.create(payload)
    return ApiResponse(data=CategoryOut.model_validate(category), message="Category created")


@router.get(
    "/{category_id}",
    response_model=ApiResponse[CategoryOut],
    summary="Get category",
)
def get_category(
    category_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: CategoryService = Depends(get_category_service),
) -> ApiResponse[CategoryOut]:
    return ApiResponse(data=CategoryOut.model_validate(service.get(category_id)))


@router.patch(
    "/{category_id}",
    response_model=ApiResponse[CategoryOut],
    summary="Update category",
)
def update_category(
    category_id: uuid.UUID,
    payload: CategoryUpdate,
    current_user: User = Depends(require_permission("products", "update")),
    service: CategoryService = Depends(get_category_service),
) -> ApiResponse[CategoryOut]:
    category = service.update(category_id, payload)
    return ApiResponse(data=CategoryOut.model_validate(category), message="Category updated")


@router.delete(
    "/{category_id}",
    response_model=MessageResponse,
    summary="Delete category",
)
def delete_category(
    category_id: uuid.UUID,
    current_user: User = Depends(require_permission("products", "delete")),
    service: CategoryService = Depends(get_category_service),
) -> MessageResponse:
    service.delete(category_id)
    return MessageResponse(message="Category deleted")
