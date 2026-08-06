"""Integration tests for the Business Intelligence endpoints."""

import pytest

from tests.conftest import auth_headers, seed_catalog


@pytest.fixture()
def bi_client(client, db):
    from tests.conftest import _truncate_all, _seed_users

    _truncate_all()
    _seed_users()
    seed_catalog(db)
    login = client.post("/api/v1/auth/login", json={"email": "admin@test.dev", "password": "Password@123"})
    token = login.json()["data"]["access_token"]
    return client, auth_headers(token)


def test_overview(bi_client):
    client, headers = bi_client
    resp = client.get("/api/v1/bi/overview", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data["kpis"]) >= 6
    kpi_keys = {k["key"] for k in data["kpis"]}
    assert {"revenue", "orders", "profit"} <= kpi_keys
    assert data["order_status"]
    assert data["top_products"]
    assert data["category_split"]


def test_forecast(bi_client):
    client, headers = bi_client
    resp = client.get("/api/v1/bi/forecast?metric=revenue&periods=4", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["metric"] == "revenue"
    assert data["trend"] in {"up", "down", "stable", "insufficient_data"}
    forecast_points = [p for p in data["points"] if p["predicted"] is not None]
    assert len(forecast_points) >= 4


def test_forecast_validates_metric_and_periods(bi_client):
    client, headers = bi_client
    assert client.get("/api/v1/bi/forecast?metric=bogus", headers=headers).status_code == 422
    assert client.get("/api/v1/bi/forecast?periods=0", headers=headers).status_code == 422
    assert client.get("/api/v1/bi/forecast?periods=60", headers=headers).status_code == 422


def test_compare(bi_client):
    client, headers = bi_client
    resp = client.get("/api/v1/bi/compare?start=2026-01-01&end=2026-06-30", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "current" in data and "previous" in data and "changes" in data
    assert data["changes"]["revenue"] is not None


def test_insights(bi_client):
    client, headers = bi_client
    resp = client.get("/api/v1/bi/insights", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "insights" in data
    assert "generated_at" in data
    assert len(data["insights"]) >= 1


def test_aggregate_by_category(bi_client):
    client, headers = bi_client
    resp = client.get("/api/v1/bi/aggregate?dimension=category", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["dimension"] == "category"
    assert data["buckets"]
    assert sum(b["percentage"] for b in data["buckets"]) > 0


def test_rankings_products(bi_client):
    client, headers = bi_client
    resp = client.get("/api/v1/bi/rankings?dimension=products&limit=5", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["dimension"] == "products"
    assert len(data["items"]) >= 1
    assert data["items"][0]["rank"] == 1


def test_trend_revenue(bi_client):
    client, headers = bi_client
    resp = client.get("/api/v1/bi/trend?metric=revenue&granularity=monthly", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["metric"] == "revenue"
    assert data["points"]
    assert data["total"] > 0


def test_bi_requires_auth(client):
    assert client.get("/api/v1/bi/overview").status_code == 401
    assert client.get("/api/v1/bi/forecast").status_code == 401
