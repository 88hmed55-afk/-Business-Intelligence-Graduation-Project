import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.models.base import Base, SoftDeleteMixin, TimestampMixin, UUIDMixin

_VALID_STATUSES = ("active", "on_leave", "terminated")


class Employee(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "employees"
    __table_args__ = (
        CheckConstraint("status IN ('active', 'on_leave', 'terminated')", name="ck_employees_status"),
        CheckConstraint("salary >= 0", name="ck_employees_salary"),
        Index("ix_employees_department", "department"),
    )

    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    position: Mapped[str] = mapped_column(String(150), nullable=False)
    salary: Mapped[Decimal] = mapped_column(
        Numeric(14, 2), nullable=False, default=0, server_default="0"
    )
    hire_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", server_default="active"
    )
    manager_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )
    address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    manager = relationship(
        "Employee", remote_side=lambda: [Employee.id], back_populates="reports"
    )
    reports: Mapped[List["Employee"]] = relationship("Employee", back_populates="manager")
    user = relationship("User")

    def __repr__(self) -> str:
        return f"<Employee id={self.id} email={self.email!r} department={self.department!r}>"
