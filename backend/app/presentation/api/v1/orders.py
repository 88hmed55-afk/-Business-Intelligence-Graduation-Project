import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query

from app.application.schemas.common import ApiResponse, MessageResponse, PaginatedResponse
from app.application.schemas.order import OrderCreate, OrderOut, OrderUpdate
from app.application.services.order_service import OrderService
from app.domain.entities.user import User
from app.presentation.deps import get_current_user, get_order_service, require_permission
from app.shared.enums import OrderStatus
from app.shared.utils.response import paginate

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[OrderOut]],
    summary="List orders",
)
def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    customer_id: uuid.UUID | None = Query(None),
    status: OrderStatus | None = Query(None),
    payment_status: str | None = Query(None, max_length=20),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    service: OrderService = Depends(get_order_service),
) -> ApiResponse[PaginatedResponse[OrderOut]]:
    orders, total = service.list(
        page,
        page_size,
        search,
        customer_id,
        status.value if status else None,
        payment_status,
        date_from,
        date_to,
    )
    payloads = service.decorate_many(orders)
    return ApiResponse(data=paginate(payloads, total, page, page_size))


@router.post(
    "",
    response_model=ApiResponse[OrderOut],
    status_code=201,
    summary="Create order",
)
def create_order(
    payload: OrderCreate,
    current_user: User = Depends(require_permission("orders", "create")),
    service: OrderService = Depends(get_order_service),
) -> ApiResponse[OrderOut]:
    order = service.create(payload)
    return ApiResponse(data=service.decorate(order), message="Order created")


@router.get(
    "/{order_id}",
    response_model=ApiResponse[OrderOut],
    summary="Get order",
)
def get_order(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: OrderService = Depends(get_order_service),
) -> ApiResponse[OrderOut]:
    return ApiResponse(data=service.decorate(service.get(order_id)))


@router.patch(
    "/{order_id}",
    response_model=ApiResponse[OrderOut],
    summary="Update order",
)
def update_order(
    order_id: uuid.UUID,
    payload: OrderUpdate,
    current_user: User = Depends(require_permission("orders", "update")),
    service: OrderService = Depends(get_order_service),
) -> ApiResponse[OrderOut]:
    order = service.update(order_id, payload)
    return ApiResponse(data=service.decorate(order), message="Order updated")


@router.delete(
    "/{order_id}",
    response_model=MessageResponse,
    summary="Delete order",
)
def delete_order(
    order_id: uuid.UUID,
    current_user: User = Depends(require_permission("orders", "delete")),
    service: OrderService = Depends(get_order_service),
) -> MessageResponse:
    service.delete(order_id)
    return MessageResponse(message="Order deleted")
