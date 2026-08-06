from fastapi import APIRouter

from app.presentation.api.v1 import (
    activity_logs,
    analytics,
    auth,
    bi,
    business_reports,
    categories,
    customers,
    dashboards,
    employees,
    inventory,
    kpis,
    notifications,
    orders,
    payments,
    products,
    reports,
    roles,
    settings,
    statistics,
    suppliers,
    users,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(dashboards.router)
api_router.include_router(reports.router)
api_router.include_router(kpis.router)
api_router.include_router(analytics.router)

api_router.include_router(customers.router)
api_router.include_router(categories.router)
api_router.include_router(suppliers.router)
api_router.include_router(products.router)
api_router.include_router(inventory.router)
api_router.include_router(orders.router)
api_router.include_router(payments.router)
api_router.include_router(employees.router)
api_router.include_router(roles.router)
api_router.include_router(roles.permissions_router)
api_router.include_router(settings.router)
api_router.include_router(notifications.router)
api_router.include_router(activity_logs.router)
api_router.include_router(business_reports.router)
api_router.include_router(statistics.router)
api_router.include_router(bi.router)
