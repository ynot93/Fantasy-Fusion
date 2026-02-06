import pytest
import pytest_asyncio
from httpx import AsyncClient
from unittest.mock import MagicMock, AsyncMock, patch
from aiohttp import ClientSession, CookieJar
from yarl import URL
from app.services.fpl_adapter import FPLAdapter
from app.api.deps import get_current_active_fpl_user, get_current_user
from app.api.deps_fpl import get_fpl_adapter
from app.main import app
from app.db.auth import models
from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

# --- MOCK DATA ---
TEST_EMAIL = "fpl_manager@test.com"
TEST_PASSWORD = "StrongFPLPassword"
TEST_MANAGER_ID = 55555
TEST_COOKIE_VALUE = "valid-fpl-session-token-xyz"
TEST_JWT_TOKEN = "test.jwt.token"
TEST_USER_ID = 99

# --- FIXTURES ---

@pytest.fixture
def mock_fpl_adapter():
    """Mock the FPL Adapter to control external API responses."""
    mock = MagicMock(spec=FPLAdapter)
    mock.bootstrap_static = AsyncMock(return_value={"teams": [{"name": "Arsenal"}]})
    mock.get_entry = AsyncMock(return_value={"entry": {"name": "Public User"}})
    mock.get_entry_picks = AsyncMock(return_value={"picks": [1, 2, 3]})
    mock.get_my_team = AsyncMock(return_value={"team": "My Squad", "bank": 10.0})
    
    # Mock the login success path
    mock.login_and_get_details = AsyncMock(return_value={
        "manager_id": TEST_MANAGER_ID, 
        "cookie": TEST_COOKIE_VALUE
    })
    
    return mock

@pytest.fixture
def override_get_adapter(mock_fpl_adapter):
    """Override the FastAPI adapter dependency."""
    app.dependency_overrides[get_fpl_adapter] = lambda: mock_fpl_adapter
    yield
    del app.dependency_overrides[get_fpl_adapter]

@pytest_asyncio.fixture
async def create_test_user(db_session: AsyncSession):
    """Fixture to create a user in the test database."""
    user = models.User(
        id=TEST_USER_ID,
        email=TEST_EMAIL,
        fpl_manager_id=TEST_MANAGER_ID,
        fpl_session_cookie=TEST_COOKIE_VALUE,
        username="fpl_test_user",
        role=models.Role.user,
        status=models.UserStatus.active
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest_asyncio.fixture
async def authenticated_fpl_headers(create_test_user):
    """Generates valid auth headers for the test user."""
    # We mock decode_token to avoid complex JWT signing in tests
    def mock_decode_token(token: str):
        if token == TEST_JWT_TOKEN:
            return {"sub": str(create_test_user.id), "role": create_test_user.role.value}
        raise Exception("Invalid token")

    with patch('app.core.security.decode_token', mock_decode_token):
        return {"Authorization": f"Bearer {TEST_JWT_TOKEN}"}

# --- TESTS ---

@pytest.mark.asyncio
async def test_adapter_login_success_internal():
    """Test FPLAdapter internal logic for cookie extraction and cleanup."""
    mock_session = MagicMock(spec=ClientSession)
    mock_session.cookie_jar = CookieJar()
    
    # Mock the internal calls the adapter makes
    mock_get_resp = AsyncMock()
    mock_get_resp.status = 200
    mock_get_resp.json = AsyncMock(return_value={"player": {"entry": TEST_MANAGER_ID}})
    mock_session.get.return_value.__aenter__.return_value = mock_get_resp

    with patch("fpl.FPL.login", new=AsyncMock()):
        adapter = FPLAdapter(mock_session)
        
        # Correctly update cookies using yarl.URL instead of hdrs.URL
        mock_session.cookie_jar.update_cookies(
            {"pl_profile": TEST_COOKIE_VALUE}, 
            URL("https://fantasy.premierleague.com")
        )

        result = await adapter.login_and_get_details(TEST_EMAIL, TEST_PASSWORD)
        
        assert result["manager_id"] == TEST_MANAGER_ID
        assert result["cookie"] == TEST_COOKIE_VALUE
        
        # Verify the jar was cleared after extraction
        cookies = mock_session.cookie_jar.filter_cookies(URL("https://fantasy.premierleague.com"))
        assert not cookies

@pytest.mark.asyncio
async def test_fpl_login_new_user_success(client, db_session: AsyncSession, override_get_adapter, mock_fpl_adapter):
    """Test login path when FPL Manager ID is NEW (auto-registration/upsert)."""
    UNIQUE_FPL_ID = 999999
    mock_fpl_adapter.login_and_get_details.return_value = {
        "manager_id": UNIQUE_FPL_ID, 
        "cookie": TEST_COOKIE_VALUE
    }

    resp = await client.post("/auth/fpl-login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})

    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["user"]["fpl_manager_id"] == UNIQUE_FPL_ID
    
    # Verify DB persistence
    query = select(models.User).where(models.User.fpl_manager_id == UNIQUE_FPL_ID)
    user = (await db_session.execute(query)).scalars().first()
    assert user is not None

@pytest.mark.asyncio
async def test_fpl_login_existing_user_update(client, create_test_user, db_session: AsyncSession, override_get_adapter, mock_fpl_adapter):
    """Test login path when FPL Manager ID exists (cookie update)."""
    NEW_COOKIE = "fresh-session-token"
    mock_fpl_adapter.login_and_get_details.return_value = {
        "manager_id": create_test_user.fpl_manager_id, 
        "cookie": NEW_COOKIE
    }
    
    resp = await client.post("/auth/fpl-login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    
    assert resp.status_code == status.HTTP_200_OK
    await db_session.refresh(create_test_user)
    assert create_test_user.fpl_session_cookie == NEW_COOKIE

@pytest.mark.asyncio
async def test_fpl_login_fpl_authentication_failure(client, override_get_adapter, mock_fpl_adapter):
    """Test case where FPL rejects the credentials."""
    mock_fpl_adapter.login_and_get_details.side_effect = Exception("FPL Auth Failed")
    resp = await client.post("/auth/fpl-login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_get_bootstrap_success(client, override_get_adapter, mock_fpl_adapter):
    """Test public cached endpoint /fpl/bootstrap."""
    resp = await client.get("/fpl/bootstrap")
    assert resp.status_code == status.HTTP_200_OK
    assert "teams" in resp.json()

@pytest.mark.asyncio
async def test_get_entry_public_success(client, override_get_adapter, mock_fpl_adapter):
    """Test public endpoint /fpl/entry/{id}."""
    resp = await client.get("/fpl/entry/12345")
    assert resp.status_code == status.HTTP_200_OK
    assert "entry" in resp.json()

@pytest.mark.asyncio
async def test_get_my_team_success(client, override_get_adapter, authenticated_fpl_headers, mock_fpl_adapter):
    """Test fetching protected data /fpl/my-team."""
    resp = await client.get("/fpl/my-team", headers=authenticated_fpl_headers)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["team"] == "My Squad"

@pytest.mark.asyncio
async def test_get_my_team_unauthorized_no_jwt(client, override_get_adapter):
    """Test accessing protected route without JWT."""
    resp = await client.get("/fpl/my-team")
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.asyncio
async def test_get_my_team_fpl_session_expired(client, override_get_adapter, authenticated_fpl_headers, mock_fpl_adapter):
    """Test handling of FPL token expiry (401 from FPL)."""
    mock_fpl_adapter.get_my_team.side_effect = Exception("Status 401 Unauthorized")
    
    # Apply override to the app instance
    app.dependency_overrides[get_fpl_adapter] = lambda: mock_fpl_adapter
    
    resp = await client.get("/fpl/my-team", headers=authenticated_fpl_headers)
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED
    assert "expired" in resp.json()["detail"].lower()
    
    del app.dependency_overrides[get_fpl_adapter]

@pytest.mark.asyncio
async def test_get_my_picks_success(client, override_get_adapter, authenticated_fpl_headers, create_test_user, mock_fpl_adapter):
    """Test fetching entry picks /fpl/my-picks/{event_id}."""
    resp = await client.get("/fpl/my-picks/10", headers=authenticated_fpl_headers)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["picks"] == [1, 2, 3]