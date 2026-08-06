"""Unit tests for the standardized error envelope and DB constraint mapping."""

import asyncio

from sqlalchemy.exc import IntegrityError


class _FakeOrig:
    def __init__(self, sqlstate: str) -> None:
        self.sqlstate = sqlstate


class _FakeRequest:
    method = "POST"
    url = type("U", (), {"path": "/api/v1/test"})()


def _integrity(sqlstate: str) -> IntegrityError:
    return IntegrityError("SELECT 1", {}, _FakeOrig(sqlstate))


def test_unique_violation_maps_to_409():
    from app.core.handlers import integrity_error_handler

    resp = asyncio.run(integrity_error_handler(_FakeRequest(), _integrity("23505")))
    assert resp.status_code == 409
    body = resp.body.decode()
    assert '"code":"CONFLICT"' in body
    assert '"success":false' in body


def test_not_null_violation_maps_to_400():
    from app.core.handlers import integrity_error_handler

    resp = asyncio.run(integrity_error_handler(_FakeRequest(), _integrity("23502")))
    assert resp.status_code == 400
    assert '"code":"BAD_REQUEST"' in resp.body.decode()


def test_foreign_key_violation_maps_to_400():
    from app.core.handlers import integrity_error_handler

    resp = asyncio.run(integrity_error_handler(_FakeRequest(), _integrity("23503")))
    assert resp.status_code == 400
    assert '"code":"BAD_REQUEST"' in resp.body.decode()


def test_unknown_integrity_error_maps_to_500_envelope():
    from app.core.handlers import integrity_error_handler

    resp = asyncio.run(integrity_error_handler(_FakeRequest(), _integrity("99999")))
    assert resp.status_code == 500
    body = resp.body.decode()
    assert '"success":false' in body
    assert '"code":"INTERNAL_ERROR"' in body


def test_error_envelope_shape_for_conflict_error():
    from starlette.responses import JSONResponse

    from app.core.exceptions import ConflictError
    from app.core.handlers import app_error_handler

    resp = asyncio.run(app_error_handler(_FakeRequest(), ConflictError("already exists")))
    assert isinstance(resp, JSONResponse)
    assert resp.status_code == 409
    payload = resp.body.decode()
    assert '"message":"already exists"' in payload
