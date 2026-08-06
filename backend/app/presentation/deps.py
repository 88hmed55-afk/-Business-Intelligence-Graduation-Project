import uuid
from typing import Callable, Optional

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.application.services.activity_log_service import ActivityLogService
from app.application.services.analytics_service import AnalyticsService
from app.application.services.auth_service import AuthService
from app.application.services.category_service import CategoryService
from app.application.services.customer_service import CustomerService
from app.application.services.dashboard_service import DashboardService
from app.application.services.employee_service import EmployeeService
from app.application.services.export_service import ExportService
from app.application.services.inventory_service import InventoryService
from app.application.services.kpi_service import KpiService
from app.application.services.notification_service import NotificationService
from app.application.services.order_service import OrderService
from app.application.services.payment_service import PaymentService
from app.application.services.product_service import ProductService
from app.application.services.report_service import ReportService
from app.application.services.reporting_service import ReportingService
from app.application.services.role_service import PermissionService, RoleService
from app.application.services.setting_service import SettingService
from app.application.services.statistics_service import StatisticsService
from app.application.services.supplier_service import SupplierService
from app.application.services.user_service import UserService
from app.core.database import get_db
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.domain.entities.user import User
from app.domain.repositories.activity_log_repository import ActivityLogRepository
from app.domain.repositories.category_repository import CategoryRepository
from app.domain.repositories.customer_repository import CustomerRepository
from app.domain.repositories.dashboard_repository import DashboardRepository
from app.domain.repositories.employee_repository import EmployeeRepository
from app.domain.repositories.inventory_repository import InventoryRepository
from app.domain.repositories.kpi_repository import KpiRepository
from app.domain.repositories.notification_repository import NotificationRepository
from app.domain.repositories.order_repository import OrderRepository
from app.domain.repositories.payment_repository import PaymentRepository
from app.domain.repositories.product_repository import ProductRepository
from app.domain.repositories.report_repository import ReportRepository
from app.domain.repositories.role_repository import PermissionRepository, RoleRepository
from app.domain.repositories.setting_repository import SettingRepository
from app.domain.repositories.supplier_repository import SupplierRepository
from app.domain.repositories.user_repository import UserRepository
from app.infrastructure.repositories.activity_log_repository import SQLAlchemyActivityLogRepository
from app.infrastructure.repositories.category_repository import SQLAlchemyCategoryRepository
from app.infrastructure.repositories.customer_repository import SQLAlchemyCustomerRepository
from app.infrastructure.repositories.dashboard_repository import SQLAlchemyDashboardRepository
from app.infrastructure.repositories.employee_repository import SQLAlchemyEmployeeRepository
from app.infrastructure.repositories.inventory_repository import SQLAlchemyInventoryRepository
from app.infrastructure.repositories.kpi_repository import SQLAlchemyKpiRepository
from app.infrastructure.repositories.notification_repository import SQLAlchemyNotificationRepository
from app.infrastructure.repositories.order_repository import SQLAlchemyOrderRepository
from app.infrastructure.repositories.payment_repository import SQLAlchemyPaymentRepository
from app.infrastructure.repositories.product_repository import SQLAlchemyProductRepository
from app.infrastructure.repositories.report_repository import SQLAlchemyReportRepository
from app.infrastructure.repositories.role_repository import (
    SQLAlchemyPermissionRepository,
    SQLAlchemyRoleRepository,
)
from app.infrastructure.repositories.setting_repository import SQLAlchemySettingRepository
from app.infrastructure.repositories.supplier_repository import SQLAlchemySupplierRepository
from app.infrastructure.repositories.user_repository import SQLAlchemyUserRepository

bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Repository factories
# ---------------------------------------------------------------------------
def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    return SQLAlchemyUserRepository(db)


def get_dashboard_repository(db: Session = Depends(get_db)) -> DashboardRepository:
    return SQLAlchemyDashboardRepository(db)


def get_report_repository(db: Session = Depends(get_db)) -> ReportRepository:
    return SQLAlchemyReportRepository(db)


def get_kpi_repository(db: Session = Depends(get_db)) -> KpiRepository:
    return SQLAlchemyKpiRepository(db)


def get_customer_repository(db: Session = Depends(get_db)) -> CustomerRepository:
    return SQLAlchemyCustomerRepository(db)


def get_category_repository(db: Session = Depends(get_db)) -> CategoryRepository:
    return SQLAlchemyCategoryRepository(db)


def get_supplier_repository(db: Session = Depends(get_db)) -> SupplierRepository:
    return SQLAlchemySupplierRepository(db)


def get_product_repository(db: Session = Depends(get_db)) -> ProductRepository:
    return SQLAlchemyProductRepository(db)


def get_inventory_repository(db: Session = Depends(get_db)) -> InventoryRepository:
    return SQLAlchemyInventoryRepository(db)


def get_order_repository(db: Session = Depends(get_db)) -> OrderRepository:
    return SQLAlchemyOrderRepository(db)


def get_payment_repository(db: Session = Depends(get_db)) -> PaymentRepository:
    return SQLAlchemyPaymentRepository(db)


def get_employee_repository(db: Session = Depends(get_db)) -> EmployeeRepository:
    return SQLAlchemyEmployeeRepository(db)


def get_role_repository(db: Session = Depends(get_db)) -> RoleRepository:
    return SQLAlchemyRoleRepository(db)


def get_permission_repository(db: Session = Depends(get_db)) -> PermissionRepository:
    return SQLAlchemyPermissionRepository(db)


def get_setting_repository(db: Session = Depends(get_db)) -> SettingRepository:
    return SQLAlchemySettingRepository(db)


def get_notification_repository(db: Session = Depends(get_db)) -> NotificationRepository:
    return SQLAlchemyNotificationRepository(db)


def get_activity_log_repository(db: Session = Depends(get_db)) -> ActivityLogRepository:
    return SQLAlchemyActivityLogRepository(db)


# ---------------------------------------------------------------------------
# Service factories (dependency injection container)
# ---------------------------------------------------------------------------
def get_auth_service(user_repo: UserRepository = Depends(get_user_repository)) -> AuthService:
    return AuthService(user_repo)


def get_user_service(user_repo: UserRepository = Depends(get_user_repository)) -> UserService:
    return UserService(user_repo)


def get_dashboard_service(
    dashboard_repo: DashboardRepository = Depends(get_dashboard_repository),
    kpi_repo: KpiRepository = Depends(get_kpi_repository),
) -> DashboardService:
    return DashboardService(dashboard_repo, kpi_repo)


def get_report_service(
    report_repo: ReportRepository = Depends(get_report_repository),
) -> ReportService:
    return ReportService(report_repo)


def get_kpi_service(
    kpi_repo: KpiRepository = Depends(get_kpi_repository),
    dashboard_repo: DashboardRepository = Depends(get_dashboard_repository),
) -> KpiService:
    return KpiService(kpi_repo, dashboard_repo)


def get_analytics_service(
    db: Session = Depends(get_db),
    user_repo: UserRepository = Depends(get_user_repository),
    dashboard_repo: DashboardRepository = Depends(get_dashboard_repository),
    report_repo: ReportRepository = Depends(get_report_repository),
    kpi_repo: KpiRepository = Depends(get_kpi_repository),
) -> AnalyticsService:
    return AnalyticsService(db, user_repo, dashboard_repo, report_repo, kpi_repo)


def get_customer_service(
    customer_repo: CustomerRepository = Depends(get_customer_repository),
) -> CustomerService:
    return CustomerService(customer_repo)


def get_category_service(
    category_repo: CategoryRepository = Depends(get_category_repository),
) -> CategoryService:
    return CategoryService(category_repo)


def get_supplier_service(
    supplier_repo: SupplierRepository = Depends(get_supplier_repository),
) -> SupplierService:
    return SupplierService(supplier_repo)


def get_product_service(
    product_repo: ProductRepository = Depends(get_product_repository),
    inventory_repo: InventoryRepository = Depends(get_inventory_repository),
) -> ProductService:
    return ProductService(product_repo, inventory_repo)


def get_inventory_service(
    inventory_repo: InventoryRepository = Depends(get_inventory_repository),
) -> InventoryService:
    return InventoryService(inventory_repo)


def get_order_service(
    order_repo: OrderRepository = Depends(get_order_repository),
    customer_repo: CustomerRepository = Depends(get_customer_repository),
    product_repo: ProductRepository = Depends(get_product_repository),
    inventory_repo: InventoryRepository = Depends(get_inventory_repository),
) -> OrderService:
    return OrderService(order_repo, customer_repo, product_repo, inventory_repo)


def get_payment_service(
    payment_repo: PaymentRepository = Depends(get_payment_repository),
    order_repo: OrderRepository = Depends(get_order_repository),
) -> PaymentService:
    return PaymentService(payment_repo, order_repo)


def get_employee_service(
    employee_repo: EmployeeRepository = Depends(get_employee_repository),
) -> EmployeeService:
    return EmployeeService(employee_repo)


def get_role_service(
    role_repo: RoleRepository = Depends(get_role_repository),
    permission_repo: PermissionRepository = Depends(get_permission_repository),
) -> RoleService:
    return RoleService(role_repo, permission_repo)


def get_permission_service(
    permission_repo: PermissionRepository = Depends(get_permission_repository),
) -> PermissionService:
    return PermissionService(permission_repo)


def get_setting_service(
    setting_repo: SettingRepository = Depends(get_setting_repository),
) -> SettingService:
    return SettingService(setting_repo)


def get_notification_service(
    notification_repo: NotificationRepository = Depends(get_notification_repository),
    user_repo: UserRepository = Depends(get_user_repository),
) -> NotificationService:
    return NotificationService(notification_repo, user_repo)


def get_activity_log_service(
    activity_log_repo: ActivityLogRepository = Depends(get_activity_log_repository),
) -> ActivityLogService:
    return ActivityLogService(activity_log_repo)


def get_reporting_service(db: Session = Depends(get_db)) -> ReportingService:
    return ReportingService(db)


def get_export_service() -> ExportService:
    return ExportService()


def get_statistics_service(db: Session = Depends(get_db)) -> StatisticsService:
    return StatisticsService(db)


def get_bi_service(db: Session = Depends(get_db)):
    from app.application.services.bi_service import BIService
    return BIService(db)


# ---------------------------------------------------------------------------
# Authentication dependencies
# ---------------------------------------------------------------------------
def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    user_repo: UserRepository = Depends(get_user_repository),
) -> User:
    if credentials is None or not credentials.credentials:
        raise UnauthorizedError("Missing or invalid authentication credentials.")

    try:
        payload = decode_token(credentials.credentials)
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Invalid or expired token.") from exc

    if payload.get("type") != "access":
        raise UnauthorizedError("Invalid token type.")

    try:
        user_id = uuid.UUID(str(payload.get("sub")))
    except (ValueError, TypeError) as exc:
        raise UnauthorizedError("Invalid token payload.") from exc

    user = user_repo.get_by_id(user_id)
    if user is None:
        raise UnauthorizedError("User not found.")
    if not user.is_active:
        raise ForbiddenError("User account is disabled.")
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise ForbiddenError("Administrator privileges required.")
    return current_user


def require_permission(module: str, action: str) -> Callable:
    """Factory returning a dependency that enforces a module:action permission.

    Administrators bypass the check; other roles must hold the permission code.
    """

    def checker(
        current_user: User = Depends(get_current_user),
        permission_service: PermissionService = Depends(get_permission_service),
    ) -> User:
        if current_user.role == "admin":
            return current_user
        codes = permission_service.resolve_permission_codes(current_user.role)
        if f"{module}:{action}" not in codes:
            raise ForbiddenError(f"Missing permission: {module}:{action}.")
        return current_user

    return checker
