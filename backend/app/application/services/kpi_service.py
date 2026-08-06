import uuid
from decimal import Decimal
from typing import Optional, Tuple

from app.application.schemas.kpi import KpiCreate, KpiOut, KpiUpdate
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.domain.entities.kpi import KPI
from app.domain.entities.user import User
from app.domain.repositories.dashboard_repository import DashboardRepository
from app.domain.repositories.kpi_repository import KpiRepository
from app.shared.enums import KpiTrend
from app.shared.utils.helpers import utc_now


class KpiService:
    def __init__(self, kpi_repo: KpiRepository, dashboard_repo: DashboardRepository | None = None) -> None:
        self.kpi_repo = kpi_repo
        self.dashboard_repo = dashboard_repo

    def _to_out(self, kpi: KPI) -> KpiOut:
        progress: float | None = None
        if kpi.target_value and kpi.current_value is not None and kpi.target_value != 0:
            progress = round(float(kpi.current_value / kpi.target_value) * 100, 1)
        return KpiOut(
            id=kpi.id,
            name=kpi.name,
            description=kpi.description,
            category=kpi.category,
            formula=kpi.formula,
            target_value=kpi.target_value,
            current_value=kpi.current_value,
            unit=kpi.unit,
            trend=kpi.trend,
            dashboard_id=kpi.dashboard_id,
            created_by=kpi.created_by,
            progress=progress,
            created_at=kpi.created_at,
            updated_at=kpi.updated_at,
        )

    def list(
        self,
        current_user: User,
        page: int,
        page_size: int,
        search: Optional[str],
        category: Optional[str],
        dashboard_id: Optional[uuid.UUID],
    ) -> Tuple[list[KpiOut], int]:
        is_admin = current_user.role == "admin"
        kpis, total = self.kpi_repo.list(
            page=page,
            page_size=page_size,
            search=search,
            owner_id=None if is_admin else current_user.id,
            category=category,
            dashboard_id=dashboard_id,
        )
        items = [self._to_out(k) for k in kpis]
        return items, total

    def _resolve(self, kpi_id: uuid.UUID, current_user: User) -> KPI:
        kpi = self.kpi_repo.get_by_id(kpi_id)
        if kpi is None:
            raise NotFoundError("KPI not found.")
        if current_user.role != "admin" and kpi.created_by != current_user.id:
            raise ForbiddenError("You do not have permission to access this KPI.")
        return kpi

    def get(self, kpi_id: uuid.UUID, current_user: User) -> KpiOut:
        return self._to_out(self._resolve(kpi_id, current_user))

    def create(self, data: KpiCreate, current_user: User) -> KpiOut:
        if data.dashboard_id is not None:
            self._assert_dashboard_accessible(data.dashboard_id, current_user)

        now = utc_now()
        entity = KPI(
            id=uuid.uuid4(),
            name=data.name,
            description=data.description,
            category=data.category.value,
            formula=data.formula,
            target_value=data.target_value,
            current_value=data.current_value,
            unit=data.unit,
            trend=data.trend.value,
            dashboard_id=data.dashboard_id,
            created_by=current_user.id,
            created_at=now,
            updated_at=now,
        )
        return self._to_out(self.kpi_repo.create(entity))

    def update(self, kpi_id: uuid.UUID, data: KpiUpdate, current_user: User) -> KpiOut:
        kpi = self._resolve(kpi_id, current_user)
        provided = data.model_fields_set

        if "dashboard_id" in provided and data.dashboard_id is not None:
            self._assert_dashboard_accessible(data.dashboard_id, current_user)

        if "name" in provided and data.name is not None:
            kpi.name = data.name
        if "description" in provided:
            kpi.description = data.description
        if "category" in provided and data.category is not None:
            kpi.category = data.category.value
        if "formula" in provided and data.formula is not None:
            kpi.formula = data.formula
        if "target_value" in provided:
            kpi.target_value = data.target_value
        if "current_value" in provided:
            kpi.current_value = data.current_value
        if "unit" in provided:
            kpi.unit = data.unit
        if "trend" in provided and data.trend is not None:
            kpi.trend = data.trend.value
        if "dashboard_id" in provided:
            kpi.dashboard_id = data.dashboard_id

        kpi.updated_at = utc_now()
        return self._to_out(self.kpi_repo.update(kpi))

    def update_value(self, kpi_id: uuid.UUID, current_value: Decimal, current_user: User) -> KpiOut:
        kpi = self._resolve(kpi_id, current_user)
        previous = kpi.current_value
        kpi.current_value = current_value
        if previous is not None:
            if current_value > previous:
                kpi.trend = KpiTrend.UP.value
            elif current_value < previous:
                kpi.trend = KpiTrend.DOWN.value
        kpi.updated_at = utc_now()
        return self._to_out(self.kpi_repo.update(kpi))

    def delete(self, kpi_id: uuid.UUID, current_user: User) -> None:
        kpi = self._resolve(kpi_id, current_user)
        self.kpi_repo.delete(kpi)

    def _assert_dashboard_accessible(self, dashboard_id: uuid.UUID, current_user: User) -> None:
        if self.dashboard_repo is None:
            raise BadRequestError("Dashboard reference is not supported.")
        dashboard = self.dashboard_repo.get_by_id(dashboard_id)
        if dashboard is None:
            raise BadRequestError("Dashboard not found.")
        if current_user.role != "admin" and dashboard.created_by != current_user.id:
            raise ForbiddenError("You do not have permission to use this dashboard.")
