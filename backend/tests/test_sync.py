"""Tests for the centralized cache invalidation middleware."""

import pytest

from app.core.constants import CACHE_OVERVIEW_KEY
from app.core.redis import get_redis
from tests.conftest import auth_headers, seed_catalog


@pytest.fixture()
def sync_client(client, db):
    from tests.conftest import _truncate_all, _seed_users

    _truncate_all()
    _seed_users()
    seed_catalog(db)
    login = client.post("/api/v1/auth/login", json={"email": "admin@test.dev", "password": "Password@123"})
    token = login.json()["data"]["access_token"]
    return client, auth_headers(token)


def _populate_overview_cache(client, headers) -> None:
    get_redis().delete(CACHE_OVERVIEW_KEY)
    resp = client.get("/api/v1/business/reports/overview", headers=headers)
    assert resp.status_code == 200
    assert get_redis().exists(CACHE_OVERVIEW_KEY) == 1


def test_mutation_invalidates_overview_cache(sync_client):
    client, headers = sync_client
    _populate_overview_cache(client, headers)

    resp = client.post(
        "/api/v1/customers",
        json={"first_name": "Noura", "last_name": "Adel", "email": "noura.sync@test.dev"},
        headers=headers,
    )
    assert resp.status_code == 201
    assert get_redis().exists(CACHE_OVERVIEW_KEY) == 0

    fresh = client.get("/api/v1/business/reports/overview", headers=headers)
    assert fresh.status_code == 200
    assert get_redis().exists(CACHE_OVERVIEW_KEY) == 1


def test_delete_invalidates_overview_cache(sync_client):
    client, headers = sync_client
    created = client.post(
        "/api/v1/customers",
        json={"first_name": "Noura", "last_name": "Adel", "email": "noura.del@test.dev"},
        headers=headers,
    ).json()["data"]
    _populate_overview_cache(client, headers)

    resp = client.delete(f"/api/v1/customers/{created['id']}", headers=headers)
    assert resp.status_code == 200
    assert get_redis().exists(CACHE_OVERVIEW_KEY) == 0


def test_read_does_not_invalidate_overview_cache(sync_client):
    client, headers = sync_client
    _populate_overview_cache(client, headers)

    assert client.get("/api/v1/business/reports/overview", headers=headers).status_code == 200
    assert get_redis().exists(CACHE_OVERVIEW_KEY) == 1


def test_export_does_not_invalidate_overview_cache(sync_client):
    client, headers = sync_client
    _populate_overview_cache(client, headers)

    resp = client.post("/api/v1/business/reports/export?report_type=sales&format=csv", headers=headers)
    assert resp.status_code == 200
    assert get_redis().exists(CACHE_OVERVIEW_KEY) == 1


def test_failed_mutation_does_not_invalidate_overview_cache(sync_client):
    client, headers = sync_client
    _populate_overview_cache(client, headers)

    resp = client.post("/api/v1/customers", json={}, headers=headers)
    assert resp.status_code == 422
    assert get_redis().exists(CACHE_OVERVIEW_KEY) == 1
