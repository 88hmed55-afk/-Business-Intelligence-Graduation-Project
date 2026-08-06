import uuid

from fastapi import APIRouter, Depends, Query

from app.application.schemas.common import ApiResponse, MessageResponse, PaginatedResponse
from app.application.schemas.employee import EmployeeCreate, EmployeeOut, EmployeeUpdate
from app.application.services.employee_service import EmployeeService
from app.domain.entities.user import User
from app.presentation.deps import get_current_user, get_employee_service, require_permission
from app.shared.enums import EmployeeStatus
from app.shared.utils.response import paginate

router = APIRouter(prefix="/employees", tags=["Employees"])


@router.get(
    "",
    response_model=ApiResponse[PaginatedResponse[EmployeeOut]],
    summary="List employees",
)
def list_employees(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, max_length=100),
    department: str | None = Query(None, max_length=100),
    status: EmployeeStatus | None = Query(None),
    current_user: User = Depends(get_current_user),
    service: EmployeeService = Depends(get_employee_service),
) -> ApiResponse[PaginatedResponse[EmployeeOut]]:
    employees, total = service.list(page, page_size, search, department, status.value if status else None)
    return ApiResponse(data=paginate([EmployeeOut.model_validate(e) for e in employees], total, page, page_size))


@router.get(
    "/departments",
    response_model=ApiResponse[list[str]],
    summary="List employee departments",
)
def list_departments(
    current_user: User = Depends(get_current_user),
    service: EmployeeService = Depends(get_employee_service),
) -> ApiResponse[list[str]]:
    return ApiResponse(data=service.departments())


@router.post(
    "",
    response_model=ApiResponse[EmployeeOut],
    status_code=201,
    summary="Create employee",
)
def create_employee(
    payload: EmployeeCreate,
    current_user: User = Depends(require_permission("employees", "create")),
    service: EmployeeService = Depends(get_employee_service),
) -> ApiResponse[EmployeeOut]:
    employee = service.create(payload)
    return ApiResponse(data=EmployeeOut.model_validate(employee), message="Employee created")


@router.get(
    "/{employee_id}",
    response_model=ApiResponse[EmployeeOut],
    summary="Get employee",
)
def get_employee(
    employee_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    service: EmployeeService = Depends(get_employee_service),
) -> ApiResponse[EmployeeOut]:
    return ApiResponse(data=EmployeeOut.model_validate(service.get(employee_id)))


@router.patch(
    "/{employee_id}",
    response_model=ApiResponse[EmployeeOut],
    summary="Update employee",
)
def update_employee(
    employee_id: uuid.UUID,
    payload: EmployeeUpdate,
    current_user: User = Depends(require_permission("employees", "update")),
    service: EmployeeService = Depends(get_employee_service),
) -> ApiResponse[EmployeeOut]:
    employee = service.update(employee_id, payload)
    return ApiResponse(data=EmployeeOut.model_validate(employee), message="Employee updated")


@router.delete(
    "/{employee_id}",
    response_model=MessageResponse,
    summary="Delete employee",
)
def delete_employee(
    employee_id: uuid.UUID,
    current_user: User = Depends(require_permission("employees", "delete")),
    service: EmployeeService = Depends(get_employee_service),
) -> MessageResponse:
    service.delete(employee_id)
    return MessageResponse(message="Employee deleted")
