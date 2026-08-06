import uuid
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.domain.entities.kpi import KPI
from app.domain.repositories.kpi_repository import KpiRepository
from app.infrastructure.models.kpi import KPI as KPIModel


class SQLAlchemyKpiRepository(KpiRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_domain(self, model: Optional[KPIModel]) -> Optional[KPI]:
        if model is None:
            return None
        return KPI(
            id=model.id,
            name=model.name,
            description=model.description,
            category=model.category,
            formula=model.formula,
            target_value=model.target_value,
            current_value=model.current_value,
            unit=model.unit,
            trend=model.trend,
            dashboard_id=model.dashboard_id,
            created_by=model.created_by,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def get_by_id(self, kpi_id: uuid.UUID) -> Optional[KPI]:
        return self._to_domain(self.db.get(KPIModel, kpi_id))

    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        owner_id: Optional[uuid.UUID] = None,
        category: Optional[str] = None,
        dashboard_id: Optional[uuid.UUID] = None,
    ) -> Tuple[list[KPI], int]:
        stmt = select(KPIModel)
        if owner_id is not None:
            stmt = stmt.where(KPIModel.created_by == owner_id)
        if category:
            stmt = stmt.where(KPIModel.category == category)
        if dashboard_id is not None:
            stmt = stmt.where(KPIModel.dashboard_id == dashboard_id)
        if search:
            stmt = stmt.where(KPIModel.name.ilike(f"%{search.strip()}%"))

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(KPIModel.updated_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return [self._to_domain(r) for r in rows if r], total

    def create(self, entity: KPI) -> KPI:
        model = KPIModel(
            id=entity.id,
            name=entity.name,
            description=entity.description,
            category=entity.category,
            formula=entity.formula,
            target_value=entity.target_value,
            current_value=entity.current_value,
            unit=entity.unit,
            trend=entity.trend,
            dashboard_id=entity.dashboard_id,
            created_by=entity.created_by,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def update(self, entity: KPI) -> KPI:
        model = self.db.get(KPIModel, entity.id)
        if model is None:
            raise NotFoundError("KPI not found.")
        model.name = entity.name
        model.description = entity.description
        model.category = entity.category
        model.formula = entity.formula
        model.target_value = entity.target_value
        model.current_value = entity.current_value
        model.unit = entity.unit
        model.trend = entity.trend
        model.dashboard_id = entity.dashboard_id
        model.updated_at = entity.updated_at
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def delete(self, entity: KPI) -> None:
        model = self.db.get(KPIModel, entity.id)
        if model is not None:
            self.db.delete(model)
            self.db.commit()

    def count(self) -> int:
        return self.db.scalar(select(func.count()).select_from(KPIModel)) or 0

    def counts_by_dashboard(self, dashboard_ids: List[uuid.UUID]) -> Dict[uuid.UUID, int]:
        if not dashboard_ids:
            return {}
        rows = self.db.execute(
            select(KPIModel.dashboard_id, func.count())
            .where(KPIModel.dashboard_id.in_(dashboard_ids))
            .group_by(KPIModel.dashboard_id)
        ).all()
        return {row[0]: int(row[1]) for row in rows}

    def aggregate_by_category(self) -> List[Dict[str, Any]]:
        rows = self.db.execute(
            text(
                """
                SELECT category,
                       COUNT(*) AS total,
                       ROUND(COALESCE(AVG(current_value), 0), 2) AS avg_current,
                       ROUND(
                         COALESCE(AVG(CASE WHEN target_value > 0 THEN (current_value / target_value) * 100 END), 0),
                         1
                       ) AS achievement
                FROM kpis
                GROUP BY category
                ORDER BY category
                """
            )
        ).all()
        return [
            {
                "category": row.category,
                "total": int(row.total),
                "avg_current": float(row.avg_current),
                "achievement": float(row.achievement),
            }
            for row in rows
        ]
