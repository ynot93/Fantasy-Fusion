import asyncio
import pytest
import pytest_asyncio
from unittest.mock import MagicMock, AsyncMock
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.main import app
from app.db.database import Base
from app.api.deps import get_db
from app.api.deps_fpl import get_fpl_adapter
from app.services.fpl_adapter import FPLAdapter
from app.core.rate_limit import fpl_login_rate_limiter
from app.db.payments.service import PaymentsService
from app.db.payments.providers.fake import FakeProvider
from app.core.security import create_access_token

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


@pytest.fixture(autouse=True)
def reset_fpl_login_rate_limiter():
    """The limiter is a module-level singleton; don't let tests bleed into each other."""
    fpl_login_rate_limiter.reset()
    yield
    fpl_login_rate_limiter.reset()


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# -----------------------------------------------------------------------------
# Shared FPL adapter mock - every auth flow goes through /auth/fpl-login now,
# so this is used anywhere a test needs to log a user in (not just test_fpl.py).
# -----------------------------------------------------------------------------
@pytest.fixture
def mock_fpl_adapter():
    """Mock the FPL Adapter to control external API responses."""
    mock = MagicMock(spec=FPLAdapter)
    mock.bootstrap_static = AsyncMock(return_value={"teams": [{"name": "Arsenal"}]})
    mock.get_entry = AsyncMock(return_value={"entry": {"name": "Public User"}})
    mock.get_entry_picks = AsyncMock(return_value={"picks": [1, 2, 3]})
    mock.get_my_team = AsyncMock(return_value={"team": "My Squad", "bank": 10.0})
    mock.login_and_get_details = AsyncMock(return_value={"manager_id": 1, "cookie": "cookie"})
    return mock


@pytest.fixture
def override_get_adapter(mock_fpl_adapter):
    """Override the FastAPI adapter dependency."""
    app.dependency_overrides[get_fpl_adapter] = lambda: mock_fpl_adapter
    yield
    del app.dependency_overrides[get_fpl_adapter]

# -----------------------------------------------------------------------------
# REAL db_session FIXTURE (for tests that request it)
# -----------------------------------------------------------------------------
@pytest_asyncio.fixture(name="db_session")
async def db_session_fixture():
    async with TestingSessionLocal() as session:
        yield session

@pytest_asyncio.fixture
async def admin_headers(client, db_session, override_get_adapter, mock_fpl_adapter):
    """
    Auth is FPL-only now (see /auth/fpl-login), so "logging in" means the
    mocked FPL adapter reports a successful login for a given manager_id.
    """
    mock_fpl_adapter.login_and_get_details.return_value = {
        "manager_id": 900001,
        "cookie": "admin-cookie",
    }
    # 1) First fpl-login auto-creates the user (role defaults to "user")
    resp1 = await client.post(
        "/auth/fpl-login", json={"email": "adminuser@example.com", "password": "irrelevant-mocked"}
    )
    assert resp1.status_code == 200, resp1.text

    # 2) Promote the user in DB
    user = (
        await db_session.execute(
            select(auth_models.User).where(auth_models.User.fpl_manager_id == 900001)
        )
    ).scalars().one()
    user.role = Role.admin
    await db_session.commit()

    # 3) Log in again so the issued JWT reflects the promoted role
    resp2 = await client.post(
        "/auth/fpl-login", json={"email": "adminuser@example.com", "password": "irrelevant-mocked"}
    )
    assert resp2.status_code == 200, resp2.text
    token = resp2.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}

@pytest_asyncio.fixture
async def auth_headers(client, override_get_adapter, mock_fpl_adapter):
    mock_fpl_adapter.login_and_get_details.return_value = {
        "manager_id": 900002,
        "cookie": "user-cookie",
    }
    resp = await client.post(
        "/auth/fpl-login", json={"email": "nouser@example.com", "password": "irrelevant-mocked"}
    )
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}

@pytest_asyncio.fixture
async def make_user(db_session):
    """Factory fixture: await make_user() to create a distinct user + valid auth headers on demand."""
    created = {"n": 0}

    async def _make_user():
        created["n"] += 1
        n = created["n"]
        user = auth_models.User(
            email=f"made-user-{n}@example.com",
            username=f"made_user_{n}",
            fpl_manager_id=800000 + n,
            role=Role.user,
            status=auth_models.UserStatus.active,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
        return {"id": user.id, "headers": {"Authorization": f"Bearer {token}"}}

    return _make_user


@pytest_asyncio.fixture
async def create_league(client, auth_headers):
    payload = {"name": "Test League"}
    response = await client.post("/leagues/", json=payload, headers=auth_headers)
    assert response.status_code == 201, response.text
    print(response.json())
    return response.json()
