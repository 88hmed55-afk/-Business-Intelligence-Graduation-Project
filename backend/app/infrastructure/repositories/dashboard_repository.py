import uuid
from typing import Optional, Tuple

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.domain.entities.dashboard import Dashboard
from app.domain.repositories.dashboard_repository import DashboardRepository
from app.infrastructure.models.dashboard import Dashboard as DashboardModel


class SQLAlchemyDashboardRepository(DashboardRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_domain(self, model: Optional[DashboardModel]) -> Optional[Dashboard]:
        if model is None:
            return None
        return Dashboard(
            id=model.id,
            name=model.name,
            slug=model.slug,
            description=model.description,
            config=model.config or {},
            is_favorite=model.is_favorite,
            is_public=model.is_public,
            created_by=model.created_by,
            created_at=model.created_at,
            updated_at=model.updated_at,
        )

    def get_by_id(self, dashboard_id: uuid.UUID) -> Optional[Dashboard]:
        return self._to_domain(self.db.get(DashboardModel, dashboard_id))

    def get_by_slug(self, slug: str) -> Optional[Dashboard]:
        stmt = select(DashboardModel).where(DashboardModel.slug == slug)
        return self._to_domain(self.db.scalar(stmt))

    def list(
        self,
        *,
        page: int,
        page_size: int,
        search: Optional[str] = None,
        owner_id: Optional[uuid.UUID] = None,
        include_public: bool = False,
        is_favorite: Optional[bool] = None,
    ) -> Tuple[list[Dashboard], int]:
        stmt = select(DashboardModel)
        if owner_id is not None:
            if include_public:
                stmt = stmt.where(
                    or_(
                        DashboardModel.created_by == owner_id,
                        DashboardModel.is_public.is_(True),
                    )
                )
            else:
                stmt = stmt.where(DashboardModel.created_by == owner_id)
        if is_favorite is not None:
            stmt = stmt.where(DashboardModel.is_favorite.is_(is_favorite))
        if search:
            stmt = stmt.where(DashboardModel.name.ilike(f"%{search.strip()}%"))

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = self.db.scalars(
            stmt.order_by(DashboardModel.updated_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        return [self._to_domain(r) for r in rows if r], total

    def create(self, entity: Dashboard) -> Dashboard:
        model = DashboardModel(
            id=entity.id,
            name=entity.name,
            slug=entity.slug,
            description=entity.description,
            config=entity.config,
            is_favorite=entity.is_favorite,
            is_public=entity.is_public,
            created_by=entity.created_by,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def update(self, entity: Dashboard) -> Dashboard:
        model = self.db.get(DashboardModel, entity.id)
        if model is None:
            raise NotFoundError("Dashboard not found.")
        model.name = entity.name
        model.slug = entity.slug
        model.description = entity.description
        model.config = entity.config
        model.is_favorite = entity.is_favorite
        model.is_public = entity.is_public
        model.updated_at = entity.updated_at
        self.db.commit()
        self.db.refresh(model)
        return self._to_domain(model) or entity

    def delete(self, entity: Dashboard) -> None:
        model = self.db.get(DashboardModel, entity.id)
        if model is not None:
            self.db.delete(model)
            self.db.commit()

    def count(self) -> int:
        return self.db.scalar(select(func.count()).select_from(DashboardModel)) or 0
