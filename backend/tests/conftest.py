"""Shared pytest fixtures for the Nova BI test suite.

Environment variables are configured BEFORE importing application modules so
that the settings singleton and engine bind to the isolated test database.
"""

import os
import uuid

# Isolate tests from any developer environment.
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("DEBUG", "false")
os.environ.setdefault("POSTGRES_HOST", "localhost")
os.environ.setdefault("POSTGRES_PORT", "5432")
os.environ.setdefault("POSTGRES_USER", "bi")
os.environ.setdefault("POSTGRES_PASSWORD", "bi_password")
os.environ.setdefault("POSTGRES_DB", "bi_system_test")
os.environ.setdefault("REDIS_DB", "15")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")

from datetime import datetime, timedelta, timezone  # noqa: E402
from decimal import Decimal  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.infrastructure.models import (  # noqa: E402
    Category,
    Customer,
    Inventory,
    Order,
    OrderItem,
    Payment,
    Product,
    Supplier,
    User,
)
from app.infrastructure.models.base import Base  # noqa: E402


def _utc(days_ago: int = 0) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days_ago)


@pytest.fixture(scope="session", autouse=True)
def _create_schema():
    """Create the full schema once per test session."""
    from app.core.database import engine

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def _truncate_all() -> None:
    """Truncate every table (CASCADE) so tests start from a clean slate."""
    db = SessionLocal()
    try:
        names = ", ".join(f'"{t.name}"' for t in reversed(Base.metadata.sorted_tables))
        db.execute(text(f"TRUNCATE TABLE {names} RESTART IDENTITY CASCADE"))
        db.commit()
    finally:
        db.close()


def _make_user(email: str, username: str, role: str, password: str = "Password@123") -> User:
    return User(
        id=uuid.uuid4(),
        email=email,
        username=username,
        full_name=f"{username.title()} User",
        hashed_password=hash_password(password),
        role=role,
        is_active=True,
        is_superuser=(role == "admin"),
        created_at=_utc(30),
        updated_at=_utc(0),
    )


def _seed_users() -> None:
    db = SessionLocal()
    try:
        db.add_all(
            [
                _make_user("admin@test.dev", "admin", "admin"),
                _make_user("analyst@test.dev", "analyst", "analyst"),
                _make_user("viewer@test.dev", "viewer", "viewer"),
            ]
        )
        db.commit()
    finally:
        db.close()


@pytest.fixture(autouse=True)
def _reset_database():
    """Reset the database and reseed baseline users before every test."""
    _truncate_all()
    _seed_users()
    yield


@pytest.fixture()
def db():
    """Direct SQLAlchemy session bound to the test database."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client():
    """TestClient with the real application (lifespan included)."""
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def admin_token(client) -> str:
    resp = client.post("/api/v1/auth/login", json={"email": "admin@test.dev", "password": "Password@123"})
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["access_token"]


@pytest.fixture()
def analyst_token(client) -> str:
    resp = client.post("/api/v1/auth/login", json={"email": "analyst@test.dev", "password": "Password@123"})
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["access_token"]


@pytest.fixture()
def viewer_token(client) -> str:
    resp = client.post("/api/v1/auth/login", json={"email": "viewer@test.dev", "password": "Password@123"})
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def seed_catalog(db) -> None:
    """Seed a compact commerce dataset used by BI / CRUD integration tests."""
    category = Category(
        id=uuid.uuid4(),
        name="Electronics",
        slug="electronics",
        description="Test category",
        sort_order=10,
        created_at=_utc(60),
        updated_at=_utc(0),
    )
    supplier = Supplier(
        id=uuid.uuid4(),
        name="Test Supplier",
        contact_name="Contact",
        email="contact@supplier.dev",
        phone="+1 555 0000",
        address="1 Test Ave",
        city="Cairo",
        country="Egypt",
        tax_id="TST-1",
        is_active=True,
        created_at=_utc(60),
        updated_at=_utc(0),
    )
    db.add_all([category, supplier])
    db.flush()

    product = Product(
        id=uuid.uuid4(),
        name="Test Laptop",
        sku="TEST-001",
        barcode="1234567890",
        description="Test product",
        category_id=category.id,
        supplier_id=supplier.id,
        unit_price=Decimal("1000.00"),
        cost_price=Decimal("600.00"),
        reorder_level=Decimal("5"),
        is_active=True,
        created_at=_utc(60),
        updated_at=_utc(0),
    )
    db.add(product)
    db.flush()

    db.add(
        Inventory(
            id=uuid.uuid4(),
            product_id=product.id,
            quantity=Decimal("50"),
            reserved_quantity=Decimal("0"),
            warehouse="main",
            location="A1-01",
            last_restocked_at=_utc(5),
            created_at=_utc(60),
            updated_at=_utc(0),
        )
    )

    customers = [
        Customer(
            id=uuid.uuid4(),
            first_name=f"Customer{i}",
            last_name="Test",
            email=f"customer{i}@test.dev",
            phone="+1 555 0001",
            company=None,
            address="1 Test St",
            city="Cairo",
            country="Egypt",
            status="active",
            created_at=_utc(180 - i * 20),
            updated_at=_utc(0),
        )
        for i in range(5)
    ]
    db.add_all(customers)
    db.flush()

    days_ago = (160, 130, 100, 70, 40)
    for i, customer in enumerate(customers):
        order = Order(
            id=uuid.uuid4(),
            order_number=f"ORD-T{i + 1}",
            customer_id=customer.id,
            status="delivered",
            subtotal=Decimal("1000.00"),
            discount_amount=Decimal("0"),
            tax_amount=Decimal("75.00"),
            shipping_fee=Decimal("0"),
            total_amount=Decimal("1075.00"),
            currency="USD",
            payment_status="paid",
            order_date=_utc(days_ago[i]),
            delivered_at=_utc(days_ago[i] - 3),
            created_at=_utc(days_ago[i]),
            updated_at=_utc(0),
        )
        db.add(order)
        db.flush()
        db.add(
            OrderItem(
                id=uuid.uuid4(),
                order_id=order.id,
                product_id=product.id,
                quantity=Decimal("1"),
                unit_price=Decimal("1000.00"),
                discount_amount=Decimal("0"),
                line_total=Decimal("1000.00"),
                created_at=order.order_date,
                updated_at=order.order_date,
            )
        )
        db.add(
            Payment(
                id=uuid.uuid4(),
                payment_number=f"PAY-T{i + 1}",
                order_id=order.id,
                amount=Decimal("1075.00"),
                method="credit_card",
                status="completed",
                transaction_id=f"TXN-T{i + 1}",
                paid_at=order.order_date + timedelta(days=1),
                created_at=order.order_date,
                updated_at=order.order_date,
            )
        )

    db.commit()


@pytest.fixture()
def seeded_commerce(db):
    """Reset and seed a minimal commerce dataset."""
    _truncate_all()
    _seed_users()
    seed_catalog(db)
    return db
