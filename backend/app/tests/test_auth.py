import pytest


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


@pytest.mark.asyncio
async def test_successful_login(client):
    # First register the user
    await client.post("/auth/register", json={
        "username": "loginuser",
        "email": "login@example.com",
        "password": "StrongPass123!"
    })

    # Attempt login
    resp = await client.post("/auth/login", json={
        "email": "login@example.com",
        "password": "StrongPass123!"
    })

    print(resp.json())
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    # Register the user
    await client.post("/auth/register", json={
        "username": "wrongpassuser",
        "email": "wrongpass@example.com",
        "password": "CorrectPass123!"
    })

    # Attempt login with wrong password
    resp = await client.post("/auth/login", json={
        "email": "wrongpass@example.com",
        "password": "WrongPass123!"
    })

    assert resp.status_code == 401
    body = resp.json()
    assert body["detail"] == "Invalid credentials"


@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    # Attempt login without registering first
    resp = await client.post("/auth/login", json={
        "email": "nouser@example.com",
        "password": "SomePass123!"
    })

    assert resp.status_code == 401
    body = resp.json()
    assert body["detail"] == "Invalid credentials"


@pytest.mark.asyncio
async def test_login_missing_fields(client):
    # Missing email
    resp = await client.post("/auth/login", json={
        "password": "StrongPass123!"
    })
    assert resp.status_code == 422  # Unprocessable Entity (validation error)

    # Missing password
    resp = await client.post("/auth/login", json={
        "email": "some@example.com"
    })
    assert resp.status_code == 422
