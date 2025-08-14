import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.database import Base
from app.api.deps import get_db

# Use a separate test DB (here SQLite in-memory for speed)
DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(DATABASE_URL, future=True, echo=False)
TestingSessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

# Override get_db dependency for tests
async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function", autouse=True)
async def prepare_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest_asyncio.fixture
async def auth_headers(client):
    # 1. Register user
    reg_payload = {
        "username": "nouser",
        "email": "nouser@example.com",
        "password": "StrongPass123!"
    }
    await client.post("/auth/register", json=reg_payload)

    # 2. Login to get token
    login_payload = {
        "email": "nouser@example.com",
        "password": "StrongPass123!"
    }
    resp = await client.post("/auth/login", json=login_payload)
    assert resp.status_code == 200
    token = resp.json()["access_token"]

    # 3. Return headers
    return {"Authorization": f"Bearer {token}"}

@pytest_asyncio.fixture
async def create_league(client, auth_headers):
    payload = {"name": "Test League"}
    response = await client.post("/leagues/", json=payload, headers=auth_headers)
    assert response.status_code == 201, response.text
    print(response.json())
    return response.json()