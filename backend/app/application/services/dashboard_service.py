import uuid
from typing import Optional, Tuple

from app.application.schemas.dashboard import DashboardCreate, DashboardOut, DashboardUpdate
from app.core.exceptions import ForbiddenError, NotFoundError
from app.domain.entities.dashboard import Dashboard
from app.domain.entities.user import User
from app.domain.repositories.dashboard_repository import DashboardRepository
from app.domain.repositories.kpi_repository import KpiRepository
from app.shared.utils.helpers import slugify, utc_now


class DashboardService:
    def __init__(self, dashboard_repo: DashboardRepository, kpi_repo: KpiRepository) -> None:
        self.dashboard_repo = dashboard_repo
        self.kpi_repo = kpi_repo

    def _unique_slug(self, name: str) -> str:
        base = slugify(name) or "dashboard"
        candidate = base
        counter = 1
        while self.dashboard_repo.get_by_slug(candidate) is not None:
            counter += 1
            candidate = f"{base}-{counter}"
        return candidate

    def _to_out(self, dashboard: Dashboard, kpi_count: int = 0) -> DashboardOut:
        return DashboardOut(
            id=dashboard.id,
            name=dashboard.name,
            slug=dashboard.slug,
            description=dashboard.description,
            config=dashboard.config,
            is_favorite=dashboard.is_favorite,
            is_public=dashboard.is_public,
            created_by=dashboard.created_by,
            kpi_count=kpi_count,
            created_at=dashboard.created_at,
            updated_at=dashboard.updated_at,
        )

    def list(
        self,
        current_user: User,
        page: int,
        page_size: int,
        search: Optional[str],
        is_favorite: Optional[bool],
    ) -> Tuple[list[DashboardOut], int]:
        is_admin = current_user.role == "admin"
        dashboards, total = self.dashboard_repo.list(
            page=page,
            page_size=page_size,
            search=search,
            owner_id=None if is_admin else current_user.id,
            include_public=not is_admin,
            is_favorite=is_favorite,
        )
        counts = self.kpi_repo.counts_by_dashboard([d.id for d in dashboards])
        items = [self._to_out(d, counts.get(d.id, 0)) for d in dashboards]
        return items, total

    def _resolve(self, dashboard_id: uuid.UUID, current_user: User, *, write: bool) -> Dashboard:
        dashboard = self.dashboard_repo.get_by_id(dashboard_id)
        if dashboard is None:
            raise NotFoundError("Dashboard not found.")
        is_admin = current_user.role == "admin"
        if write and not is_admin and dashboard.created_by != current_user.id:
            raise ForbiddenError("You do not have permission to modify this dashboard.")
        if (
            not write
            and not is_admin
            and dashboard.created_by != current_user.id
            and not dashboard.is_public
        ):
            raise ForbiddenError("You do not have access to this dashboard.")
        return dashboard

    def get(self, dashboard_id: uuid.UUID, current_user: User) -> DashboardOut:
        dashboard = self._resolve(dashboard_id, current_user, write=False)
        counts = self.kpi_repo.counts_by_dashboard([dashboard.id])
        return self._to_out(dashboard, counts.get(dashboard.id, 0))

    def create(self, data: DashboardCreate, current_user: User) -> DashboardOut:
        now = utc_now()
        entity = Dashboard(
            id=uuid.uuid4(),
            name=data.name,
            slug=self._unique_slug(data.name),
            description=data.description,
            config=data.config or {},
            is_favorite=False,
            is_public=data.is_public,
            created_by=current_user.id,
            created_at=now,
            updated_at=now,
        )
        created = self.dashboard_repo.create(entity)
        return self._to_out(created, 0)

    def update(self, dashboard_id: uuid.UUID, data: DashboardUpdate, current_user: User) -> DashboardOut:
        dashboard = self._resolve(dashboard_id, current_user, write=True)
        provided = data.model_fields_set

        if "name" in provided and data.name is not None:
            if data.name != dashboard.name:
                dashboard.name = data.name
                dashboard.slug = self._unique_slug(data.name)
        if "description" in provided:
            dashboard.description = data.description
        if "config" in provided and data.config is not None:
            dashboard.config = data.config
        if "is_public" in provided and data.is_public is not None:
            dashboard.is_public = data.is_public
        if "is_favorite" in provided and data.is_favorite is not None:
            dashboard.is_favorite = data.is_favorite

        dashboard.updated_at = utc_now()
        updated = self.dashboard_repo.update(dashboard)
        counts = self.kpi_repo.counts_by_dashboard([updated.id])
        return self._to_out(updated, counts.get(updated.id, 0))

    def toggle_favorite(self, dashboard_id: uuid.UUID, current_user: User) -> DashboardOut:
        dashboard = self._resolve(dashboard_id, current_user, write=True)
        dashboard.is_favorite = not dashboard.is_favorite
        dashboard.updated_at = utc_now()
        updated = self.dashboard_repo.update(dashboard)
        return self._to_out(updated)

    def delete(self, dashboard_id: uuid.UUID, current_user: User) -> None:
        dashboard = self._resolve(dashboard_id, current_user, write=True)
        self.dashboard_repo.delete(dashboard)
