import uuid

from fastapi import APIRouter, Depends, Query

from app.application.schemas.common import ApiResponse, PaginatedResponse
from app.application.schemas.inventory import (
    InventoryAdjustRequest,
    InventoryMovementOut,
    InventoryOut,
)
from app.application.services.inventory_service import InventoryService
from app.domain.entities.user import User
from app.presentation.deps import get_current_user, get_inventory_service, require_permission
from app.shared.enums import InventoryMovement
from app.shared.utils.response import paginate

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[InventoryOut]],
    summary="List inventory records",
)
def list_inventory(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    warehouse: str | None = Query(None, max_length=150),
    low_stock: bool | None = Query(None),
    current_user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> ApiResponse[PaginatedResponse[InventoryOut]]:
    items, total = service.list(page, page_size, search, warehouse, low_stock)
    return ApiResponse(data=paginate([InventoryOut.model_validate(i) for i in items], total, page, page_size))


@router.get(
    "/low-stock",
    response_model=ApiResponse[list],
    summary="Low stock items",
)
def low_stock(
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> ApiResponse[list]:
    items = service.low_stock(limit=limit)
    return ApiResponse(data=[InventoryOut.model_validate(i).model_dump() for i in items], message="Low stock items")


@router.get(
    "/products/{product_id}",
    response_model=ApiResponse[InventoryOut],
    summary="Inventory record for a product",
)
def inventory_for_product(
    product_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> ApiResponse[InventoryOut]:
    return ApiResponse(data=InventoryOut.model_validate(service.get_by_product(product_id)))


@router.post(
    "/products/{product_id}/adjust",
    response_model=ApiResponse[InventoryOut],
    summary="Adjust product stock",
)
def adjust_stock(
    product_id: uuid.UUID,
    payload: InventoryAdjustRequest,
    current_user: User = Depends(require_permission("inventory", "update")),
    service: InventoryService = Depends(get_inventory_service),
) -> ApiResponse[InventoryOut]:
    inventory = service.adjust(product_id, payload)
    return ApiResponse(data=InventoryOut.model_validate(inventory), message="Stock adjusted")


@router.get(
    "/movements",
    response_model=ApiResponse[PaginatedResponse[InventoryMovementOut]],
    summary="List inventory movements",
)
def list_movements(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    product_id: uuid.UUID | None = Query(None),
    movement_type: InventoryMovement | None = Query(None),
    current_user: User = Depends(get_current_user),
    service: InventoryService = Depends(get_inventory_service),
) -> ApiResponse[PaginatedResponse[InventoryMovementOut]]:
    items, total = service.movements(
        page, page_size, product_id, movement_type.value if movement_type else None
    )
    return ApiResponse(data=paginate([InventoryMovementOut.model_validate(i) for i in items], total, page, page_size))
