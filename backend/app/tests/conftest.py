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
from app.core.rate_limit import login_rate_limiter, fpl_verify_rate_limiter, password_reset_rate_limiter
from app.db.payments.service import PaymentsService
from app.db.payments.providers.fake import FakeProvider
from app.core.security import create_access_token, get_password_hash

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
def reset_rate_limiters():
    """The limiters are module-level singletons; don't let tests bleed into each other."""
    limiters = (login_rate_limiter, fpl_verify_rate_limiter, password_reset_rate_limiter)
    for limiter in limiters:
        limiter.reset()
    yield
    for limiter in limiters:
        limiter.reset()


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# -----------------------------------------------------------------------------
# Shared FPL adapter mock - every FPL call in the app goes through FPLAdapter,
# so tests control FPL's responses here.
# -----------------------------------------------------------------------------
@pytest.fixture
def mock_fpl_adapter():
    """Mock the FPL Adapter to control external API responses."""
    mock = MagicMock(spec=FPLAdapter)
    mock.bootstrap_static = AsyncMock(return_value={"teams": [{"name": "Arsenal"}]})
    mock.get_entry = AsyncMock(return_value={"entry": {"name": "Public User"}})
    mock.get_entry_picks = AsyncMock(return_value={"picks": [1, 2, 3]})
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


async def _signup_linked_verified(client, db_session, email, manager_id, role=Role.user):
    """Sign up through the real endpoint, then link + verify an FPL team directly
    in the DB, so tests outside test_fpl.py start from a fully onboarded user."""
    resp = await client.post("/auth/signup", json={"email": email, "password": "correct-horse-1"})
    assert resp.status_code == 201, resp.text
    user = (
        await db_session.execute(select(auth_models.User).where(auth_models.User.email == email))
    ).scalars().one()
    user.fpl_manager_id = manager_id
    user.fpl_verified = True
    user.role = role
    await db_session.commit()
    # Fresh token so the role claim matches
    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def admin_headers(client, db_session, override_get_adapter):
    return await _signup_linked_verified(client, db_session, "adminuser@example.com", 900001, role=Role.admin)

@pytest_asyncio.fixture
async def auth_headers(client, db_session, override_get_adapter):
    return await _signup_linked_verified(client, db_session, "nouser@example.com", 900002)

@pytest_asyncio.fixture
async def make_user(db_session):
    """Factory fixture: await make_user() to create a distinct user + valid auth headers on demand.
    Pass linked/verified=False to get a user at an earlier onboarding stage."""
    created = {"n": 0}

    async def _make_user(linked: bool = True, verified: bool = True):
        created["n"] += 1
        n = created["n"]
        user = auth_models.User(
            email=f"made-user-{n}@example.com",
            username=f"made_user_{n}",
            hashed_password=get_password_hash("correct-horse-1"),
            fpl_manager_id=800000 + n if linked else None,
            fpl_verified=linked and verified,
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
