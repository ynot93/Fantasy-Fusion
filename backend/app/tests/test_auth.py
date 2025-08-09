import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_register():
    response = client.post("/auth/register", json={
        "name": "Tony",
        "email": "tony@example.com",
        "password": "secret123"
    })
    assert response.status_code == 200
    assert "id" in response.json()

def test_login():
    response = client.post("/auth/login", json={
        "email": "tony@example.com",
        "password": "secret123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
