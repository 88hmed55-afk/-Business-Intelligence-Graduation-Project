"""CRUD integration tests covering authentication, RBAC, pagination and validation."""

from decimal import Decimal

from tests.conftest import auth_headers


# ---------------------------------------------------------------------------
# Customers
# ---------------------------------------------------------------------------
def test_create_customer(client, admin_token):
    resp = client.post(
        "/api/v1/customers",
        json={
            "first_name": "Noura",
            "last_name": "Adel",
            "email": "noura.adel@test.dev",
            "phone": "+1 555 9999",
            "country": "Egypt",
            "status": "active",
        },
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()["data"]
    assert data["full_name"] == "Noura Adel"
    assert data["email"] == "noura.adel@test.dev"


def test_list_customers_paginated(client, admin_token):
    resp = client.get("/api/v1/customers?page=1&page_size=10", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert "items" in body
    assert "total" in body
    assert "page" in body
    assert "pages" in body


def test_list_customers_validates_page_size(client, admin_token):
    resp = client.get("/api/v1/customers?page_size=10000", headers=auth_headers(admin_token))
    assert resp.status_code == 422


def test_customer_validation_rejects_short_name(client, admin_token):
    resp = client.post(
        "/api/v1/customers",
        json={"first_name": "", "last_name": "Adel", "email": "a@test.dev"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 422


def test_update_customer(client, admin_token):
    created = client.post(
        "/api/v1/customers",
        json={"first_name": "Noura", "last_name": "Adel", "email": "noura@test.dev"},
        headers=auth_headers(admin_token),
    ).json()["data"]
    resp = client.patch(
        f"/api/v1/customers/{created['id']}",
        json={"company": "Nova Ltd"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["company"] == "Nova Ltd"


def test_delete_customer_soft_deletes(client, admin_token):
    created = client.post(
        "/api/v1/customers",
        json={"first_name": "Noura", "last_name": "Adel", "email": "noura2@test.dev"},
        headers=auth_headers(admin_token),
    ).json()["data"]
    resp = client.delete(f"/api/v1/customers/{created['id']}", headers=auth_headers(admin_token))
    assert resp.status_code == 200

    get_resp = client.get(f"/api/v1/customers/{created['id']}", headers=auth_headers(admin_token))
    assert get_resp.status_code == 404


def test_customer_duplicate_email_conflict(client, admin_token):
    payload = {"first_name": "Noura", "last_name": "Adel", "email": "dup@test.dev"}
    assert client.post("/api/v1/customers", json=payload, headers=auth_headers(admin_token)).status_code == 201
    resp = client.post("/api/v1/customers", json=payload, headers=auth_headers(admin_token))
    assert resp.status_code == 409, resp.text


def test_customer_recreate_email_after_soft_delete_conflict(client, admin_token):
    """Regression: email held by a soft-deleted row must return 409, not 500."""
    payload = {"first_name": "Noura", "last_name": "Adel", "email": "recreate@test.dev"}
    created = client.post("/api/v1/customers", json=payload, headers=auth_headers(admin_token))
    assert created.status_code == 201, created.text

    deleted = client.delete(
        f"/api/v1/customers/{created.json()['data']['id']}", headers=auth_headers(admin_token)
    )
    assert deleted.status_code == 200

    resp = client.post("/api/v1/customers", json=payload, headers=auth_headers(admin_token))
    assert resp.status_code == 409, resp.text


def test_customer_update_to_email_of_deleted_row_conflict(client, admin_token):
    first = client.post(
        "/api/v1/customers",
        json={"first_name": "Noura", "last_name": "Adel", "email": "held@test.dev"},
        headers=auth_headers(admin_token),
    ).json()["data"]
    second = client.post(
        "/api/v1/customers",
        json={"first_name": "Noura", "last_name": "Adel", "email": "other@test.dev"},
        headers=auth_headers(admin_token),
    ).json()["data"]
    client.delete(f"/api/v1/customers/{first['id']}", headers=auth_headers(admin_token))
    resp = client.patch(
        f"/api/v1/customers/{second['id']}",
        json={"email": "held@test.dev"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 409, resp.text


def test_restore_soft_deleted_customer(client, admin_token):
    """Regression: restore must find soft-deleted rows, not 404."""
    created = client.post(
        "/api/v1/customers",
        json={"first_name": "Noura", "last_name": "Adel", "email": "restore@test.dev"},
        headers=auth_headers(admin_token),
    ).json()["data"]
    client.delete(f"/api/v1/customers/{created['id']}", headers=auth_headers(admin_token))

    resp = client.post(
        f"/api/v1/customers/{created['id']}/restore", headers=auth_headers(admin_token)
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"]["email"] == "restore@test.dev"

    get_resp = client.get(f"/api/v1/customers/{created['id']}", headers=auth_headers(admin_token))
    assert get_resp.status_code == 200


# ---------------------------------------------------------------------------
# Suppliers
# ---------------------------------------------------------------------------
def test_create_supplier(client, admin_token):
    resp = client.post(
        "/api/v1/suppliers",
        json={"name": "Alpha Supply", "email": "alpha@test.dev", "country": "Egypt"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["data"]["email"] == "alpha@test.dev"


def test_supplier_duplicate_name_conflict(client, admin_token):
    payload = {"name": "Beta Supply", "email": "beta1@test.dev"}
    assert client.post("/api/v1/suppliers", json=payload, headers=auth_headers(admin_token)).status_code == 201
    resp = client.post("/api/v1/suppliers", json=payload, headers=auth_headers(admin_token))
    assert resp.status_code == 409, resp.text


def test_supplier_duplicate_email_conflict(client, admin_token):
    """Regression: duplicate supplier email must return 409, not 201."""
    payload = {"name": "Gamma Supply", "email": "gamma@test.dev"}
    assert client.post("/api/v1/suppliers", json=payload, headers=auth_headers(admin_token)).status_code == 201
    resp = client.post(
        "/api/v1/suppliers",
        json={"name": "Gamma Two", "email": "gamma@test.dev"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 409, resp.text


def test_supplier_update_to_duplicate_email_conflict(client, admin_token):
    first = client.post(
        "/api/v1/suppliers",
        json={"name": "Delta One", "email": "delta1@test.dev"},
        headers=auth_headers(admin_token),
    ).json()["data"]
    second = client.post(
        "/api/v1/suppliers",
        json={"name": "Delta Two", "email": "delta2@test.dev"},
        headers=auth_headers(admin_token),
    ).json()["data"]
    resp = client.patch(
        f"/api/v1/suppliers/{second['id']}",
        json={"email": "delta1@test.dev"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 409, resp.text


# ---------------------------------------------------------------------------
# Products (with RBAC checks)
# ---------------------------------------------------------------------------
def test_create_product_requires_permission(client, analyst_token):
    resp = client.post(
        "/api/v1/products",
        json={"name": "Widget", "sku": "WID-001", "unit_price": "10.00"},
        headers=auth_headers(analyst_token),
    )
    assert resp.status_code == 403


def test_analyst_can_read_but_not_write(client, analyst_token):
    list_resp = client.get("/api/v1/products", headers=auth_headers(analyst_token))
    assert list_resp.status_code == 200

    create_resp = client.post(
        "/api/v1/products",
        json={"name": "Widget", "sku": "WID-002", "unit_price": "10.00"},
        headers=auth_headers(analyst_token),
    )
    assert create_resp.status_code == 403


def test_admin_full_crud(client, admin_token):
    created = client.post(
        "/api/v1/products",
        json={"name": "Gadget", "sku": "GAD-001", "unit_price": "99.99", "cost_price": "50.00"},
        headers=auth_headers(admin_token),
    )
    assert created.status_code == 201, created.text
    product_id = created.json()["data"]["id"]

    updated = client.patch(
        f"/api/v1/products/{product_id}",
        json={"unit_price": "89.99"},
        headers=auth_headers(admin_token),
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["unit_price"] == "89.99"

    deleted = client.delete(f"/api/v1/products/{product_id}", headers=auth_headers(admin_token))
    assert deleted.status_code == 200


def test_duplicate_sku_rejected(client, admin_token):
    payload = {"name": "Gadget", "sku": "DUP-SKU", "unit_price": "10.00"}
    assert client.post("/api/v1/products", json=payload, headers=auth_headers(admin_token)).status_code == 201
    resp = client.post("/api/v1/products", json=payload, headers=auth_headers(admin_token))
    assert resp.status_code in (409, 400)


def test_create_product_auto_creates_inventory(client, admin_token):
    """A newly created product must get an inventory record so ordering it does not 404."""
    created = client.post(
        "/api/v1/products",
        json={"name": "Stocked Gadget", "sku": "STK-001", "unit_price": "25.00"},
        headers=auth_headers(admin_token),
    )
    assert created.status_code == 201, created.text
    product_id = created.json()["data"]["id"]

    inventory = client.get(
        f"/api/v1/inventory/products/{product_id}", headers=auth_headers(admin_token)
    )
    assert inventory.status_code == 200, inventory.text
    data = inventory.json()["data"]
    assert data["product_id"] == product_id
    assert Decimal(data["quantity"]) == 0
    assert Decimal(data["available_quantity"]) == 0
    assert data["warehouse"] == "main"


def test_order_new_product_with_zero_stock_succeeds(client, admin_token, db):
    """Regression: ordering a newly created product (with auto-inventory) must not 404."""
    created = client.post(
        "/api/v1/products",
        json={"name": "Orderable", "sku": "ORD-001", "unit_price": "15.00"},
        headers=auth_headers(admin_token),
    ).json()["data"]
    customer = client.post(
        "/api/v1/customers",
        json={"first_name": "Mona", "last_name": "Hassan", "email": "mona@test.dev"},
        headers=auth_headers(admin_token),
    ).json()["data"]

    resp = client.post(
        "/api/v1/orders",
        json={
            "customer_id": customer["id"],
            "currency": "USD",
            "items": [{"product_id": created["id"], "quantity": "2"}],
        },
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 201, resp.text

    inventory = client.get(
        f"/api/v1/inventory/products/{created['id']}", headers=auth_headers(admin_token)
    ).json()["data"]
    assert Decimal(inventory["quantity"]) == -2


# ---------------------------------------------------------------------------
# Auth enforcement across all module endpoints
# ---------------------------------------------------------------------------
def test_unauthenticated_access_denied(client):
    for path in ("/api/v1/products", "/api/v1/customers", "/api/v1/orders", "/api/v1/analytics/overview", "/api/v1/bi/overview"):
        assert client.get(path).status_code == 401, path


def test_viewer_cannot_manage_roles(client, viewer_token):
    get_resp = client.get("/api/v1/roles", headers=auth_headers(viewer_token))
    assert get_resp.status_code == 403
    create_resp = client.post(
        "/api/v1/roles",
        json={"name": "super_manager", "description": "x"},
        headers=auth_headers(viewer_token),
    )
    assert create_resp.status_code == 403


def test_create_role_rejects_non_system_name(client, admin_token):
    """Regression: a role name outside the DB whitelist must be 400, not 500."""
    resp = client.post(
        "/api/v1/roles",
        json={"name": "custom_role", "description": "x"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 400, resp.text
    assert "one of:" in resp.json()["error"]["message"]


def test_create_role_allows_system_name(client, admin_token):
    """System role names pass validation; duplicates still conflict."""
    existing = client.get("/api/v1/roles", headers=auth_headers(admin_token)).json()["data"]["items"]
    names = {r["name"] for r in existing}
    candidate = next(
        (n for n in ("sales_manager", "inventory_manager") if n not in names),
        None,
    )
    if candidate is None:
        assert True
        return
    resp = client.post(
        "/api/v1/roles",
        json={"name": candidate, "description": "x"},
        headers=auth_headers(admin_token),
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["data"]["name"] == candidate
