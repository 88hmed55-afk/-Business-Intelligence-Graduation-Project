import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query

from app.application.schemas.common import ApiResponse, MessageResponse, PaginatedResponse
from app.application.schemas.payment import PaymentCreate, PaymentOut, PaymentUpdate
from app.application.services.payment_service import PaymentService
from app.domain.entities.user import User
from app.presentation.deps import get_current_user, get_payment_service, require_permission
from app.shared.enums import PaymentMethod, PaymentStatus
from app.shared.utils.response import paginate

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[PaymentOut]],
    summary="List payments",
)
def list_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    order_id: uuid.UUID | None = Query(None),
    status: PaymentStatus | None = Query(None),
    method: PaymentMethod | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    current_user: User = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service),
) -> ApiResponse[PaginatedResponse[PaymentOut]]:
    payments, total = service.list(
        page,
        page_size,
        search,
        order_id,
        status.value if status else None,
        method.value if method else None,
        date_from,
        date_to,
    )
    return ApiResponse(data=paginate([PaymentOut.model_validate(p) for p in payments], total, page, page_size))


@router.post(
    "",
    response_model=ApiResponse[PaymentOut],
    status_code=201,
    summary="Create payment",
)
def create_payment(
    payload: PaymentCreate,
    current_user: User = Depends(require_permission("payments", "create")),
    service: PaymentService = Depends(get_payment_service),
) -> ApiResponse[PaymentOut]:
    payment = service.create(payload)
    return ApiResponse(data=PaymentOut.model_validate(payment), message="Payment created")


@router.get(
    "/{payment_id}",
    response_model=ApiResponse[PaymentOut],
    summary="Get payment",
)
def get_payment(
    payment_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: PaymentService = Depends(get_payment_service),
) -> ApiResponse[PaymentOut]:
    return ApiResponse(data=PaymentOut.model_validate(service.get(payment_id)))


@router.patch(
    "/{payment_id}",
    response_model=ApiResponse[PaymentOut],
    summary="Update payment",
)
def update_payment(
    payment_id: uuid.UUID,
    payload: PaymentUpdate,
    current_user: User = Depends(require_permission("payments", "update")),
    service: PaymentService = Depends(get_payment_service),
) -> ApiResponse[PaymentOut]:
    payment = service.update(payment_id, payload)
    return ApiResponse(data=PaymentOut.model_validate(payment), message="Payment updated")


@router.delete(
    "/{payment_id}",
    response_model=MessageResponse,
    summary="Delete payment",
)
def delete_payment(
    payment_id: uuid.UUID,
    current_user: User = Depends(require_permission("payments", "delete")),
    service: PaymentService = Depends(get_payment_service),
) -> MessageResponse:
    service.delete(payment_id)
    return MessageResponse(message="Payment deleted")
