from __future__ import annotations
import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.shared.enums import EmployeeStatus


class EmployeeBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=50)
    department: str = Field(min_length=1, max_length=100)
    position: str = Field(min_length=1, max_length=150)
    salary: Decimal = Field(default=Decimal("0"), ge=0)
    hire_date: datetime
    status: EmployeeStatus = EmployeeStatus.ACTIVE
    manager_id: uuid.UUID | None = None
    user_id: uuid.UUID | None = None
    address: str | None = Field(default=None, max_length=500)
    city: str | None = Field(default=None, max_length=100)


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=50)
    department: str | None = Field(default=None, min_length=1, max_length=100)
    position: str | None = Field(default=None, min_length=1, max_length=150)
    salary: Decimal | None = Field(default=None, ge=0)
    hire_date: datetime | None = None
    status: EmployeeStatus | None = None
    manager_id: uuid.UUID | None = None
    user_id: uuid.UUID | None = None
    address: str | None = Field(default=None, max_length=500)
    city: str | None = Field(default=None, max_length=100)


class EmployeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID | None = None
    first_name: str
    last_name: str
    email: str
    phone: str | None = None
    department: str
    position: str
    salary: Decimal
    hire_date: datetime
    status: EmployeeStatus
    manager_id: uuid.UUID | None = None
    address: str | None = None
    city: str | None = None
    full_name: str
    created_at: datetime
    updated_at: datetime
