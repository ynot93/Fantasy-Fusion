import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.main import app
from app.db.database import Base
from app.api.deps import get_db
from app.db.payments.service import PaymentsService
from app.db.payments.providers.fake import FakeProvider

import app.db.auth.models as auth_models
import app.db.payments.models as pay_models
import app.db.leagues.models as league_models

from app.db.admin.enums import Role

# Use a separate test DB (here SQLite in-memory for speed)
DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(DATABASE_URL, future=True, echo=False)
TestingSessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

# Override get_db dependency for tests
async def get_test_db():
    async with TestingSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = get_test_db


# override payments service to use fakes
def _svc():
    return PaymentsService({
        "MPESA": FakeProvider("MPESA"),
        "PAYPAL": FakeProvider("PAYPAL"),
        "STRIPE": FakeProvider("STRIPE")
    })
from app.api.routes.payments import get_payments_service
app.dependency_overrides[get_payments_service] = _svc


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

# -----------------------------------------------------------------------------
# REAL db_session FIXTURE (for tests that request it)
# -----------------------------------------------------------------------------
@pytest_asyncio.fixture(name="db_session")
async def db_session_fixture():
    async with TestingSessionLocal() as session:
        yield session

@pytest_asyncio.fixture
async def admin_headers(client, db_session):
    # 1) Register the user first
    reg_payload = {
        "username": "adminuser",
        "email": "adminuser@example.com",
        "password": "StrongPass123!",
        # Your API might ignore role here; we’ll force it in DB anyway
        "role": Role.admin.value,
    }
    resp_reg = await client.post("/auth/register", json=reg_payload)
    assert resp_reg.status_code in (200, 201), resp_reg.text

    # 2) Promote the user in DB (in case register doesn't set role)
    user = (
        await db_session.execute(
            select(auth_models.User).where(auth_models.User.email == "adminuser@example.com")
        )
    ).scalars().one()
    user.role = Role.admin
    await db_session.commit()

    # 3) Login to get a token that your guard will accept
    resp_login = await client.post(
        "/auth/login",
        json={"email": "adminuser@example.com", "password": "StrongPass123!"},
    )
    assert resp_login.status_code == 200, resp_login.text
    token = resp_login.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}

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
