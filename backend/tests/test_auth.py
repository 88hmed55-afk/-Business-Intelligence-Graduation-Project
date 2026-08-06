"""Integration tests for the authentication API."""

from tests.conftest import auth_headers


def test_login_success(client):
    resp = client.post("/api/v1/auth/login", json={"email": "admin@test.dev", "password": "Password@123"})
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["access_token"]
    assert data["refresh_token"]
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "admin@test.dev"
    assert data["user"]["role"] == "admin"


def test_login_invalid_credentials(client):
    resp = client.post("/api/v1/auth/login", json={"email": "admin@test.dev", "password": "wrong-password"})
    assert resp.status_code == 401
    assert resp.json()["success"] is False


def test_login_validation_rejects_bad_email(client):
    resp = client.post("/api/v1/auth/login", json={"email": "not-an-email", "password": "Password@123"})
    assert resp.status_code == 422


def test_me_returns_current_user(client, admin_token):
    resp = client.get("/api/v1/auth/me", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    assert resp.json()["data"]["email"] == "admin@test.dev"


def test_me_requires_auth(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_me_rejects_garbage_token(client):
    resp = client.get("/api/v1/auth/me", headers=auth_headers("not.a.valid.token"))
    assert resp.status_code == 401


def test_refresh_flow(client):
    login = client.post("/api/v1/auth/login", json={"email": "analyst@test.dev", "password": "Password@123"})
    refresh_token = login.json()["data"]["refresh_token"]
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert resp.json()["data"]["access_token"]


def test_refresh_rejects_access_token(client, admin_token):
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": admin_token})
    assert resp.status_code == 401


def test_logout_then_refresh_is_rejected(client):
    login = client.post("/api/v1/auth/login", json={"email": "admin@test.dev", "password": "Password@123"})
    tokens = login.json()["data"]
    resp = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": tokens["refresh_token"]},
        headers=auth_headers(tokens["access_token"]),
    )
    assert resp.status_code == 200

    refresh_resp = client.post("/api/v1/auth/refresh", json={"refresh_token": tokens["refresh_token"]})
    assert refresh_resp.status_code == 401


def test_change_password_flow(client, admin_token):
    resp = client.post(
        "/api/v1/auth/change-password",
        json={"old_password": "Password@123", "new_password": "NewPassword@456"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 200

    login = client.post("/api/v1/auth/login", json={"email": "admin@test.dev", "password": "NewPassword@456"})
    assert login.status_code == 200


def test_change_password_requires_current_password(client, admin_token):
    resp = client.post(
        "/api/v1/auth/change-password",
        json={"old_password": "not-the-current", "new_password": "NewPassword@456"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 401
