import re
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import status
from jose import jwt

from app.api.routes import auth as auth_routes
from app.core import security
from app.core.config import settings

EMAIL = "reset-me@test.com"
OLD_PASSWORD = "old-password-1"
NEW_PASSWORD = "new-password-2"


@pytest.fixture
def sent_emails(monkeypatch):
    """Capture outgoing email instead of sending/logging it."""
    sent = []

    async def fake_send_email(to, subject, body):
        sent.append({"to": to, "subject": subject, "body": body})

    monkeypatch.setattr(auth_routes, "send_email", fake_send_email)
    return sent


async def _signup(client, email=EMAIL, password=OLD_PASSWORD):
    resp = await client.post("/auth/signup", json={"email": email, "password": password})
    assert resp.status_code == status.HTTP_201_CREATED, resp.text
    return resp.json()


def _token_from(email_body: str) -> str:
    match = re.search(r"/reset-password\?token=(\S+)", email_body)
    assert match, email_body
    return match.group(1)


async def _request_reset_token(client, sent_emails, email=EMAIL) -> str:
    resp = await client.post("/auth/password-reset/request", json={"email": email})
    assert resp.status_code == status.HTTP_202_ACCEPTED
    return _token_from(sent_emails[-1]["body"])


async def _login(client, password, email=EMAIL):
    return await client.post("/auth/login", json={"email": email, "password": password})


@pytest.mark.asyncio
async def test_request_sends_link_to_frontend(client, sent_emails):
    await _signup(client)
    resp = await client.post("/auth/password-reset/request", json={"email": EMAIL.upper()})
    assert resp.status_code == status.HTTP_202_ACCEPTED
    assert len(sent_emails) == 1
    assert sent_emails[0]["to"] == EMAIL
    assert f"{settings.FRONTEND_URL}/reset-password?token=" in sent_emails[0]["body"]


@pytest.mark.asyncio
async def test_request_for_unknown_email_looks_identical_but_sends_nothing(client, sent_emails):
    await _signup(client)
    known = await client.post("/auth/password-reset/request", json={"email": EMAIL})
    unknown = await client.post("/auth/password-reset/request", json={"email": "nobody@test.com"})
    assert unknown.status_code == known.status_code == status.HTTP_202_ACCEPTED
    assert unknown.json() == known.json()
    assert [e["to"] for e in sent_emails] == [EMAIL]


@pytest.mark.asyncio
async def test_confirm_changes_password(client, sent_emails):
    await _signup(client)
    token = await _request_reset_token(client, sent_emails)

    resp = await client.post("/auth/password-reset/confirm", json={"token": token, "password": NEW_PASSWORD})
    assert resp.status_code == status.HTTP_200_OK, resp.text

    assert (await _login(client, OLD_PASSWORD)).status_code == status.HTTP_401_UNAUTHORIZED
    assert (await _login(client, NEW_PASSWORD)).status_code == status.HTTP_200_OK


@pytest.mark.asyncio
async def test_token_is_single_use(client, sent_emails):
    await _signup(client)
    token = await _request_reset_token(client, sent_emails)

    first = await client.post("/auth/password-reset/confirm", json={"token": token, "password": NEW_PASSWORD})
    assert first.status_code == status.HTTP_200_OK
    again = await client.post("/auth/password-reset/confirm", json={"token": token, "password": "third-password-3"})
    assert again.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.asyncio
async def test_older_token_dies_when_a_newer_one_is_used(client, sent_emails):
    await _signup(client)
    older = await _request_reset_token(client, sent_emails)
    newer = await _request_reset_token(client, sent_emails)

    assert (await client.post("/auth/password-reset/confirm", json={"token": newer, "password": NEW_PASSWORD})).status_code == 200
    resp = await client.post("/auth/password-reset/confirm", json={"token": older, "password": "third-password-3"})
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.asyncio
async def test_expired_token_rejected(client, sent_emails, monkeypatch):
    await _signup(client)
    # Negative lifetime -> the emailed token is already expired
    monkeypatch.setattr(settings, "PASSWORD_RESET_EXPIRE_MINUTES", -1)
    token = await _request_reset_token(client, sent_emails)
    resp = await client.post("/auth/password-reset/confirm", json={"token": token, "password": NEW_PASSWORD})
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.asyncio
async def test_access_token_cannot_reset_password(client):
    signup = await _signup(client)
    resp = await client.post(
        "/auth/password-reset/confirm",
        json={"token": signup["access_token"], "password": NEW_PASSWORD},
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.asyncio
async def test_reset_token_cannot_be_used_as_bearer_token(client, sent_emails):
    await _signup(client)
    token = await _request_reset_token(client, sent_emails)
    resp = await client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
async def test_forged_token_signed_with_login_key_rejected(client):
    """A token with the right claims but signed with the plain JWT key must not work."""
    signup = await _signup(client)
    forged = jwt.encode(
        {
            "sub": str(signup["user"]["id"]),
            "purpose": "password_reset",
            "pwd": "0" * 32,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
        },
        settings.JWT_SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    resp = await client.post("/auth/password-reset/confirm", json={"token": forged, "password": NEW_PASSWORD})
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.asyncio
async def test_confirm_rejects_short_password(client, sent_emails):
    await _signup(client)
    token = await _request_reset_token(client, sent_emails)
    resp = await client.post("/auth/password-reset/confirm", json={"token": token, "password": "short"})
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_request_is_rate_limited(client, sent_emails):
    for _ in range(5):
        assert (await client.post("/auth/password-reset/request", json={"email": EMAIL})).status_code == 202
    resp = await client.post("/auth/password-reset/request", json={"email": EMAIL})
    assert resp.status_code == status.HTTP_429_TOO_MANY_REQUESTS


def test_reset_token_roundtrip_and_fingerprint():
    hashed = security.get_password_hash(OLD_PASSWORD)
    token = security.create_password_reset_token(42, hashed)
    user_id, fingerprint = security.read_password_reset_token(token)
    assert user_id == 42
    assert security.password_fingerprint_matches(hashed, fingerprint)
    assert not security.password_fingerprint_matches(security.get_password_hash(NEW_PASSWORD), fingerprint)
