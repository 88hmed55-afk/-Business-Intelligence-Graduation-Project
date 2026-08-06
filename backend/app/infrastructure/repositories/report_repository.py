import uuid
from typing import Optional, Tuple

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.domain.entities.report import Report
from app.domain.repositories.report_repository import ReportRepository
from app.infrastructure.models.report import Report as ReportModel


class SQLAlchemyReportRepository(ReportRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_domain(self, model: Optional[ReportModel]) -> Optional[Report]:
        if model is None:
            return None
        return Report(
            id=model.id,
            name=model.name,
            description=model.description,
            query=model.query,
            status=model.status,
            schedule=model.schedule,
            config=model.config or {},
            created_by=model.created_by,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def get_by_id(self, report_id: uuid.UUID) -> Optional[Report]:
        return self._to_domain(self.db.get(ReportModel, report_id))

    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        owner_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
    ) -> Tuple[list[Report], int]:
        stmt = select(ReportModel)
        if owner_id is not None:
            stmt = stmt.where(ReportModel.created_by == owner_id)
        if status:
            stmt = stmt.where(ReportModel.status == status)
        if search:
            like = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(ReportModel.name.ilike(like), ReportModel.description.ilike(like))
            )

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(ReportModel.updated_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return [self._to_domain(r) for r in rows if r], total

    def create(self, entity: Report) -> Report:
        model = ReportModel(
            id=entity.id,
            name=entity.name,
            description=entity.description,
            query=entity.query,
            status=entity.status,
            schedule=entity.schedule,
            config=entity.config,
            created_by=entity.created_by,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def update(self, entity: Report) -> Report:
        model = self.db.get(ReportModel, entity.id)
        if model is None:
            raise NotFoundError("Report not found.")
        model.name = entity.name
        model.description = entity.description
        model.query = entity.query
        model.status = entity.status
        model.schedule = entity.schedule
        model.config = entity.config
        model.updated_at = entity.updated_at
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def delete(self, entity: Report) -> None:
        model = self.db.get(ReportModel, entity.id)
        if model is not None:
            self.db.delete(model)
            self.db.commit()

    def count(self) -> int:
        return self.db.scalar(select(func.count()).select_from(ReportModel)) or 0

    def count_by_status(self, status: str) -> int:
        return (
            self.db.scalar(
                select(func.count()).select_from(ReportModel).where(ReportModel.status == status)
            )
            or 0
        )
