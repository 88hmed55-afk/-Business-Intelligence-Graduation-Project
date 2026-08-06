import uuid

from fastapi import APIRouter, Depends, Query

from app.application.schemas.common import ApiResponse, MessageResponse, PaginatedResponse
from app.application.schemas.supplier import SupplierCreate, SupplierOut, SupplierUpdate
from app.application.services.supplier_service import SupplierService
from app.domain.entities.user import User
from app.presentation.deps import get_current_user, get_supplier_service, require_permission
from app.shared.utils.response import paginate

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[SupplierOut]],
    summary="List suppliers",
)
def list_suppliers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    country: str | None = Query(None, max_length=100),
    is_active: bool | None = Query(None),
    current_user: User = Depends(get_current_user),
    service: SupplierService = Depends(get_supplier_service),
) -> ApiResponse[PaginatedResponse[SupplierOut]]:
    suppliers, total = service.list(page, page_size, search, country, is_active)
    return ApiResponse(data=paginate([SupplierOut.model_validate(s) for s in suppliers], total, page, page_size))


@router.post(
    "",
    response_model=ApiResponse[SupplierOut],
    status_code=201,
    summary="Create supplier",
)
def create_supplier(
    payload: SupplierCreate,
    current_user: User = Depends(require_permission("suppliers", "create")),
    service: SupplierService = Depends(get_supplier_service),
) -> ApiResponse[SupplierOut]:
    supplier = service.create(payload)
    return ApiResponse(data=SupplierOut.model_validate(supplier), message="Supplier created")


@router.get(
    "/{supplier_id}",
    response_model=ApiResponse[SupplierOut],
    summary="Get supplier",
)
def get_supplier(
    supplier_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: SupplierService = Depends(get_supplier_service),
) -> ApiResponse[SupplierOut]:
    return ApiResponse(data=SupplierOut.model_validate(service.get(supplier_id)))


@router.patch(
    "/{supplier_id}",
    response_model=ApiResponse[SupplierOut],
    summary="Update supplier",
)
def update_supplier(
    supplier_id: uuid.UUID,
    payload: SupplierUpdate,
    current_user: User = Depends(require_permission("suppliers", "update")),
    service: SupplierService = Depends(get_supplier_service),
) -> ApiResponse[SupplierOut]:
    supplier = service.update(supplier_id, payload)
    return ApiResponse(data=SupplierOut.model_validate(supplier), message="Supplier updated")


@router.delete(
    "/{supplier_id}",
    response_model=MessageResponse,
    summary="Delete supplier",
)
def delete_supplier(
    supplier_id: uuid.UUID,
    current_user: User = Depends(require_permission("suppliers", "delete")),
    service: SupplierService = Depends(get_supplier_service),
) -> MessageResponse:
    service.delete(supplier_id)
    return MessageResponse(message="Supplier deleted")
