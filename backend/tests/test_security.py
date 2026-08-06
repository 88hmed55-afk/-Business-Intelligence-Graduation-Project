import uuid

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hashing_roundtrip():
    hashed = hash_password("SuperSecret123")
    assert verify_password("SuperSecret123", hashed)
    assert not verify_password("wrong-password", hashed)


def test_password_hashes_are_salted():
    first = hash_password("SuperSecret123")
    second = hash_password("SuperSecret123")
    assert first != second


def test_access_token_roundtrip():
    user_id = uuid.uuid4()
    token = create_access_token(str(user_id))
    payload = decode_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["type"] == "access"
    assert "exp" in payload


def test_refresh_token_carries_jti():
    token = create_refresh_token(str(uuid.uuid4()))
    payload = decode_token(token)
    assert payload["type"] == "refresh"
    assert payload.get("jti")


def test_invalid_token_raises():
    import jwt

    try:
        decode_token("not.a.valid.token")
    except jwt.PyJWTError:
        return
    raise AssertionError("decode_token should reject malformed tokens")
