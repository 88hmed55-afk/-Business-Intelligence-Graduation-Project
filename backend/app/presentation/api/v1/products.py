import uuid

from fastapi import APIRouter, Depends, Query

from app.application.schemas.common import ApiResponse, MessageResponse, PaginatedResponse
from app.application.schemas.product import ProductCreate, ProductOut, ProductUpdate
from app.application.services.product_service import ProductService
from app.domain.entities.user import User
from app.presentation.deps import get_current_user, get_product_service, require_permission
from app.shared.utils.response import paginate

router = APIRouter(prefix="/products", tags=["Products"])


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[ProductOut]],
    summary="List products",
)
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    category_id: uuid.UUID | None = Query(None),
    supplier_id: uuid.UUID | None = Query(None),
    is_active: bool | None = Query(None),
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    current_user: User = Depends(get_current_user),
    service: ProductService = Depends(get_product_service),
) -> ApiResponse[PaginatedResponse[ProductOut]]:
    products, total = service.list(
        page, page_size, search, category_id, supplier_id, is_active, min_price, max_price
    )
    return ApiResponse(data=paginate([ProductOut.model_validate(p) for p in products], total, page, page_size))


@router.post(
    "",
    response_model=ApiResponse[ProductOut],
    status_code=201,
    summary="Create product",
)
def create_product(
    payload: ProductCreate,
    current_user: User = Depends(require_permission("products", "create")),
    service: ProductService = Depends(get_product_service),
) -> ApiResponse[ProductOut]:
    product = service.create(payload)
    return ApiResponse(data=ProductOut.model_validate(product), message="Product created")


@router.get(
    "/top-sellers",
    response_model=ApiResponse[list],
    summary="Top selling products",
)
def top_sellers(
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    service: ProductService = Depends(get_product_service),
) -> ApiResponse[list]:
    return ApiResponse(data=service.top_sellers(limit=limit), message="Top sellers")


@router.get(
    "/{product_id}",
    response_model=ApiResponse[ProductOut],
    summary="Get product",
)
def get_product(
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: ProductService = Depends(get_product_service),
) -> ApiResponse[ProductOut]:
    return ApiResponse(data=ProductOut.model_validate(service.get(product_id)))


@router.patch(
    "/{product_id}",
    response_model=ApiResponse[ProductOut],
    summary="Update product",
)
def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdate,
    current_user: User = Depends(require_permission("products", "update")),
    service: ProductService = Depends(get_product_service),
) -> ApiResponse[ProductOut]:
    product = service.update(product_id, payload)
    return ApiResponse(data=ProductOut.model_validate(product), message="Product updated")


@router.delete(
    "/{product_id}",
    response_model=MessageResponse,
    summary="Delete product",
)
def delete_product(
    product_id: uuid.UUID,
    current_user: User = Depends(require_permission("products", "delete")),
    service: ProductService = Depends(get_product_service),
) -> MessageResponse:
    service.delete(product_id)
    return MessageResponse(message="Product deleted")
