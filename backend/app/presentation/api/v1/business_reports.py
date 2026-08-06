from datetime import date, datetime
from typing import Any, Dict

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.application.schemas.common import ApiResponse
from app.application.schemas.reporting import (
    CustomerReportRow,
    InventoryReportRow,
    MonthlyReportRow,
    ProductReportRow,
    ProfitReportRow,
    ReportResponse,
    SalesReportRow,
    YearlyReportRow,
)
from app.application.services.export_service import ExportService
from app.application.services.reporting_service import ReportingService
from app.domain.entities.user import User
from app.presentation.deps import get_current_user, get_export_service, get_reporting_service
from app.shared.enums import ReportExportFormat

router = APIRouter(prefix="/business/reports", tags=["Business Reports"])

DEFAULT_START = date(2024, 1, 1)
DEFAULT_END = date.today()


@router.get(
    "/sales",
    response_model=ApiResponse[ReportResponse[SalesReportRow]],
    summary="Daily sales report",
)
def sales_report(
    date_from: date = Query(default=DEFAULT_START),
    date_to: date = Query(default=DEFAULT_END),
    current_user: User = Depends(get_current_user),
    service: ReportingService = Depends(get_reporting_service),
) -> ApiResponse[ReportResponse[SalesReportRow]]:
    report = service.sales_report(
        datetime.combine(date_from, datetime.min.time()), datetime.combine(date_to, datetime.min.time())
    )
    return ApiResponse(data=report)


@router.get(
    "/profit",
    response_model=ApiResponse[ReportResponse[ProfitReportRow]],
    summary="Profit report",
)
def profit_report(
    date_from: date = Query(default=DEFAULT_START),
    date_to: date = Query(default=DEFAULT_END),
    current_user: User = Depends(get_current_user),
    service: ReportingService = Depends(get_reporting_service),
) -> ApiResponse[ReportResponse[ProfitReportRow]]:
    report = service.profit_report(
        datetime.combine(date_from, datetime.min.time()), datetime.combine(date_to, datetime.min.time())
    )
    return ApiResponse(data=report)


@router.get(
    "/customers",
    response_model=ApiResponse[ReportResponse[CustomerReportRow]],
    summary="Customer report",
)
def customer_report(
    date_from: date = Query(default=DEFAULT_START),
    date_to: date = Query(default=DEFAULT_END),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    service: ReportingService = Depends(get_reporting_service),
) -> ApiResponse[ReportResponse[CustomerReportRow]]:
    report = service.customer_report(
        datetime.combine(date_from, datetime.min.time()), datetime.combine(date_to, datetime.min.time()), limit
    )
    return ApiResponse(data=report)


@router.get(
    "/products",
    response_model=ApiResponse[ReportResponse[ProductReportRow]],
    summary="Product performance report",
)
def product_report(
    date_from: date = Query(default=DEFAULT_START),
    date_to: date = Query(default=DEFAULT_END),
    current_user: User = Depends(get_current_user),
    service: ReportingService = Depends(get_reporting_service),
) -> ApiResponse[ReportResponse[ProductReportRow]]:
    report = service.product_report(
        datetime.combine(date_from, datetime.min.time()), datetime.combine(date_to, datetime.min.time())
    )
    return ApiResponse(data=report)


@router.get(
    "/inventory",
    response_model=ApiResponse[ReportResponse[InventoryReportRow]],
    summary="Inventory status report",
)
def inventory_report(
    warehouse: str | None = Query(None, max_length=150),
    current_user: User = Depends(get_current_user),
    service: ReportingService = Depends(get_reporting_service),
) -> ApiResponse[ReportResponse[InventoryReportRow]]:
    return ApiResponse(data=service.inventory_report(warehouse))


@router.get(
    "/monthly",
    response_model=ApiResponse[ReportResponse[MonthlyReportRow]],
    summary="Monthly aggregated report",
)
def monthly_report(
    date_from: date = Query(default=DEFAULT_START),
    date_to: date = Query(default=DEFAULT_END),
    current_user: User = Depends(get_current_user),
    service: ReportingService = Depends(get_reporting_service),
) -> ApiResponse[ReportResponse[MonthlyReportRow]]:
    report = service.monthly_report(
        datetime.combine(date_from, datetime.min.time()), datetime.combine(date_to, datetime.min.time())
    )
    return ApiResponse(data=report)


@router.get(
    "/yearly",
    response_model=ApiResponse[ReportResponse[YearlyReportRow]],
    summary="Yearly aggregated report",
)
def yearly_report(
    current_user: User = Depends(get_current_user),
    service: ReportingService = Depends(get_reporting_service),
) -> ApiResponse[ReportResponse[YearlyReportRow]]:
    return ApiResponse(data=service.yearly_report())


@router.get(
    "/overview",
    response_model=ApiResponse[Dict[str, Any]],
    summary="Commerce overview",
)
def overview(
    current_user: User = Depends(get_current_user),
    service: ReportingService = Depends(get_reporting_service),
) -> ApiResponse[Dict[str, Any]]:
    return ApiResponse(data=service.commerce_overview())


@router.post(
    "/export",
    response_class=Response,
    summary="Export a business report (CSV / XLSX / PDF)",
)
def export_report(
    report_type: str = Query(...),
    format: ReportExportFormat = Query(...),
    date_from: date = Query(default=DEFAULT_START),
    date_to: date = Query(default=DEFAULT_END),
    current_user: User = Depends(get_current_user),
    service: ReportingService = Depends(get_reporting_service),
    exporter: ExportService = Depends(get_export_service),
) -> Response:
    handler = {
        "sales": lambda: service.sales_report(
            datetime.combine(date_from, datetime.min.time()), datetime.combine(date_to, datetime.min.time())
        ),
        "profit": lambda: service.profit_report(
            datetime.combine(date_from, datetime.min.time()), datetime.combine(date_to, datetime.min.time())
        ),
        "customers": lambda: service.customer_report(
            datetime.combine(date_from, datetime.min.time()), datetime.combine(date_to, datetime.min.time()), 500
        ),
        "products": lambda: service.product_report(
            datetime.combine(date_from, datetime.min.time()), datetime.combine(date_to, datetime.min.time())
        ),
        "inventory": lambda: service.inventory_report(None),
        "monthly": lambda: service.monthly_report(
            datetime.combine(date_from, datetime.min.time()), datetime.combine(date_to, datetime.min.time())
        ),
        "yearly": lambda: service.yearly_report(),
    }
    if report_type not in handler:
        from fastapi import HTTPException

        raise HTTPException(status_code=422, detail="Unsupported report type.")

    report = handler[report_type]()
    rows = [row.model_dump(mode="json") for row in report.rows]
    content_type, content, filename = exporter.export(
        report_type=report_type, rows=rows, format=format, title=f"Nova BI - {report_type.title()} Report"
    )
    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
