import uuid
from typing import Optional, Tuple

from app.application.schemas.report import ReportCreate, ReportUpdate
from app.core.exceptions import ForbiddenError, NotFoundError
from app.domain.entities.report import Report
from app.domain.entities.user import User
from app.domain.repositories.report_repository import ReportRepository
from app.shared.utils.helpers import utc_now


class ReportService:
    def __init__(self, report_repo: ReportRepository) -> None:
        self.report_repo = report_repo

    def list(
        self,
        current_user: User,
        page: int,
        page_size: int,
        search: Optional[str],
        status: Optional[str],
    ) -> Tuple[list[Report], int]:
        is_admin = current_user.role == "admin"
        return self.report_repo.list(
            page=page,
            page_size=page_size,
            search=search,
            owner_id=None if is_admin else current_user.id,
            status=status,
        )

    def _resolve(self, report_id: uuid.UUID, current_user: User) -> Report:
        report = self.report_repo.get_by_id(report_id)
        if report is None:
            raise NotFoundError("Report not found.")
        if current_user.role != "admin" and report.created_by != current_user.id:
            raise ForbiddenError("You do not have permission to access this report.")
        return report

    def get(self, report_id: uuid.UUID, current_user: User) -> Report:
        return self._resolve(report_id, current_user)

    def create(self, data: ReportCreate, current_user: User) -> Report:
        now = utc_now()
        entity = Report(
            id=uuid.uuid4(),
            name=data.name,
            description=data.description,
            query=data.query,
            status=data.status.value,
            schedule=data.schedule,
            config=data.config or {},
            created_by=current_user.id,
            created_at=now,
            updated_at=now,
        )
        return self.report_repo.create(entity)

    def update(self, report_id: uuid.UUID, data: ReportUpdate, current_user: User) -> Report:
        report = self._resolve(report_id, current_user)
        provided = data.model_fields_set

        if "name" in provided and data.name is not None:
            report.name = data.name
        if "description" in provided:
            report.description = data.description
        if "query" in provided and data.query is not None:
            report.query = data.query
        if "schedule" in provided:
            report.schedule = data.schedule
        if "config" in provided and data.config is not None:
            report.config = data.config
        if "status" in provided and data.status is not None:
            report.status = data.status.value

        report.updated_at = utc_now()
        return self.report_repo.update(report)

    def change_status(self, report_id: uuid.UUID, status: str, current_user: User) -> Report:
        report = self._resolve(report_id, current_user)
        report.status = status
        report.updated_at = utc_now()
        return self.report_repo.update(report)

    def delete(self, report_id: uuid.UUID, current_user: User) -> None:
        report = self._resolve(report_id, current_user)
        self.report_repo.delete(report)
