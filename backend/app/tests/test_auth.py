import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_email_already_registered(client):
    # First registration
    resp1 = await client.post("/auth/register", json={
        "username": "testuser",
        "email": "user@example.com",
        "password": "StrongPass123!"
    })
    print(resp1.json())
    assert resp1.status_code == 201

    # Second registration with same email
    resp2 = await client.post("/auth/register", json={
        "username": "anotheruser",
        "email": "user@example.com",
        "password": "AnotherPass123!"
    })
    assert resp2.status_code == 400
    assert resp2.json()["detail"] == "Email already registered"


@pytest.mark.asyncio
async def test_invalid_email_format(client):
    resp = await client.post("/auth/register", json={
        "username": "testuser2",
        "email": "invalid-email",
        "password": "StrongPass123!"
    })
    assert resp.status_code == 422  # validation error from Pydantic


@pytest.mark.asyncio
async def test_password_too_short(client):
    resp = await client.post("/auth/register", json={
        "username": "newuser",
        "email": "newuser@example.com",
        "password": "123"
    })
    assert resp.status_code == 400
    assert "Password too short" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_empty_email_and_password(client):
    resp = await client.post("/auth/register", json={
        "username": "emptyuser",
        "email": "",
        "password": ""
    })
    assert resp.status_code == 422  # Fails Pydantic validation


@pytest.mark.asyncio
async def test_successful_registration(client):
    resp = await client.post("/auth/register", json={
        "username": "uniqueuser",
        "email": "unique@example.com",
        "password": "StrongPass123!"
    })
    print(resp.json())
    assert resp.status_code == 201
    body = resp.json()
    assert "id" in body
    assert body["email"] == "unique@example.com"
