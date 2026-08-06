"""Health and system endpoint tests."""


def test_health_reports_ok(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] in {"ok", "degraded"}
    assert body["checks"]["database"] == "ok"
    assert "version" in body
    assert "environment" in body


def test_root_metadata(client):
    resp = client.get("/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"]
    assert body["docs"] == "/api/docs"


def test_openapi_is_available(client):
    resp = client.get("/api/openapi.json")
    assert resp.status_code == 200
    assert "paths" in resp.json()


def test_unknown_route_returns_404_json(client):
    resp = client.get("/api/v1/definitely-not-a-route")
    assert resp.status_code == 404
    assert resp.json()["success"] is False
