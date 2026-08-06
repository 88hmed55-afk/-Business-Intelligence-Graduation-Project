import uuid

from fastapi import APIRouter, Depends, Query

from app.application.schemas.common import ApiResponse, MessageResponse, PaginatedResponse
from app.application.schemas.customer import CustomerCreate, CustomerOut, CustomerUpdate
from app.application.services.customer_service import CustomerService
from app.domain.entities.user import User
from app.presentation.deps import get_current_user, get_customer_service, require_permission
from app.shared.enums import CustomerStatus
from app.shared.utils.response import paginate

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[CustomerOut]],
    summary="List customers",
)
def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    status: CustomerStatus | None = Query(None),
    country: str | None = Query(None, max_length=100),
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(get_customer_service),
) -> ApiResponse[PaginatedResponse[CustomerOut]]:
    customers, total = service.list(page, page_size, search, status.value if status else None, country)
    return ApiResponse(data=paginate([CustomerOut.model_validate(c) for c in customers], total, page, page_size))


@router.post(
    "",
    response_model=ApiResponse[CustomerOut],
    status_code=201,
    summary="Create customer",
)
def create_customer(
    payload: CustomerCreate,
    current_user: User = Depends(require_permission("customers", "create")),
    service: CustomerService = Depends(get_customer_service),
) -> ApiResponse[CustomerOut]:
    customer = service.create(payload)
    return ApiResponse(data=CustomerOut.model_validate(customer), message="Customer created")


@router.get(
    "/{customer_id}",
    response_model=ApiResponse[CustomerOut],
    summary="Get customer",
)
def get_customer(
    customer_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: CustomerService = Depends(get_customer_service),
) -> ApiResponse[CustomerOut]:
    return ApiResponse(data=CustomerOut.model_validate(service.get(customer_id)))


@router.patch(
    "/{customer_id}",
    response_model=ApiResponse[CustomerOut],
    summary="Update customer",
)
def update_customer(
    customer_id: uuid.UUID,
    payload: CustomerUpdate,
    current_user: User = Depends(require_permission("customers", "update")),
    service: CustomerService = Depends(get_customer_service),
) -> ApiResponse[CustomerOut]:
    customer = service.update(customer_id, payload)
    return ApiResponse(data=CustomerOut.model_validate(customer), message="Customer updated")


@router.delete(
    "/{customer_id}",
    response_model=MessageResponse,
    summary="Delete customer",
)
def delete_customer(
    customer_id: uuid.UUID,
    current_user: User = Depends(require_permission("customers", "delete")),
    service: CustomerService = Depends(get_customer_service),
) -> MessageResponse:
    service.delete(customer_id)
    return MessageResponse(message="Customer deleted")


@router.post(
    "/{customer_id}/restore",
    response_model=ApiResponse[CustomerOut],
    summary="Restore soft-deleted customer",
)
def restore_customer(
    customer_id: uuid.UUID,
    current_user: User = Depends(require_permission("customers", "update")),
    service: CustomerService = Depends(get_customer_service),
) -> ApiResponse[CustomerOut]:
    customer = service.restore(customer_id)
    return ApiResponse(data=CustomerOut.model_validate(customer), message="Customer restored")
