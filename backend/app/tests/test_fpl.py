import pytest
from unittest.mock import AsyncMock, MagicMock
from aiohttp import ClientSession
from fastapi import status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.auth import models
from app.services.fpl_adapter import FPLAdapter, FPLEntryNotFound, parse_manager_id

TEST_EMAIL = "manager@test.com"
TEST_PASSWORD = "correct-horse-1"
VERIFICATION_LEAGUE_ID = 4242
VERIFICATION_LEAGUE_CODE = "abc123"

ENTRY = {
    "name": "Solio Moose",
    "player_first_name": "Chris",
    "player_last_name": "Musson",
    "summary_overall_points": 463,
    "leagues": {"classic": [{"id": 314, "name": "Overall"}]},
}


def _entry_in_league(league_id: int) -> dict:
    return {**ENTRY, "leagues": {"classic": [{"id": 314}, {"id": league_id}]}}


@pytest.fixture
def verification_league(monkeypatch):
    monkeypatch.setattr(settings, "FPL_VERIFICATION_LEAGUE_ID", VERIFICATION_LEAGUE_ID)
    monkeypatch.setattr(settings, "FPL_VERIFICATION_LEAGUE_CODE", VERIFICATION_LEAGUE_CODE)


async def _signup(client, email=TEST_EMAIL, password=TEST_PASSWORD):
    resp = await client.post("/auth/signup", json={"email": email, "password": password})
    assert resp.status_code == status.HTTP_201_CREATED, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# --- parse_manager_id ---

@pytest.mark.parametrize("text,expected", [
    ("1234567", 1234567),
    ("  1234567 ", 1234567),
    ("https://fantasy.premierleague.com/entry/1234567/event/8", 1234567),
    ("fantasy.premierleague.com/entry/42/history", 42),
    ("0", None),
    ("not a team", None),
    ("https://fantasy.premierleague.com/leagues/314/standings/c", None),
])
def test_parse_manager_id(text, expected):
    assert parse_manager_id(text) == expected


# --- Adapter ---

def _mock_session(status_code: int, payload: dict):
    session = MagicMock(spec=ClientSession)
    resp = AsyncMock()
    resp.status = status_code
    resp.json = AsyncMock(return_value=payload)
    session.get.return_value.__aenter__.return_value = resp
    return session


@pytest.mark.asyncio
async def test_adapter_get_entry_404_raises_not_found_and_is_not_cached():
    """FPL answers unknown IDs with 404 + {"detail": ...}; that must not be treated as a team."""
    adapter = FPLAdapter(_mock_session(404, {"detail": "No Entry matches the given query."}))
    with pytest.raises(FPLEntryNotFound):
        await adapter.get_entry(987654321)
    with pytest.raises(FPLEntryNotFound):
        await adapter.get_entry(987654321)


@pytest.mark.asyncio
async def test_adapter_get_entry_picks_needs_no_cookie():
    session = _mock_session(200, {"picks": [1, 2, 3]})
    adapter = FPLAdapter(session)
    assert await adapter.get_entry_picks(1, 7) == {"picks": [1, 2, 3]}
    session.get.assert_called_once_with("https://fantasy.premierleague.com/api/entry/1/event/7/picks/")


# --- Signup / login ---

@pytest.mark.asyncio
async def test_signup_creates_user_with_hashed_password(client, db_session: AsyncSession):
    resp = await client.post("/auth/signup", json={"email": "New.User@Test.com", "password": TEST_PASSWORD})
    assert resp.status_code == status.HTTP_201_CREATED
    body = resp.json()
    assert body["user"]["email"] == "new.user@test.com"
    assert body["user"]["fpl_manager_id"] is None
    assert body["user"]["fpl_verified"] is False

    user = (await db_session.execute(select(models.User).where(models.User.email == "new.user@test.com"))).scalars().one()
    assert user.hashed_password != TEST_PASSWORD


@pytest.mark.asyncio
async def test_signup_duplicate_email_conflicts(client):
    await _signup(client)
    resp = await client.post("/auth/signup", json={"email": TEST_EMAIL.upper(), "password": TEST_PASSWORD})
    assert resp.status_code == status.HTTP_409_CONFLICT


@pytest.mark.asyncio
async def test_signup_rejects_short_password(client):
    resp = await client.post("/auth/signup", json={"email": TEST_EMAIL, "password": "short"})
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_login_success_and_me(client):
    await _signup(client)
    resp = await client.post("/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert resp.status_code == status.HTTP_200_OK
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    me = await client.get("/auth/me", headers=headers)
    assert me.status_code == status.HTTP_200_OK
    assert me.json()["email"] == TEST_EMAIL


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await _signup(client)
    resp = await client.post("/auth/login", json={"email": TEST_EMAIL, "password": "wrong-password"})
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
async def test_login_unknown_email(client):
    resp = await client.post("/auth/login", json={"email": "nobody@test.com", "password": TEST_PASSWORD})
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
async def test_login_rate_limited_after_repeated_attempts(client):
    """The 6th attempt within the window from the same client should be throttled."""
    payload = {"email": TEST_EMAIL, "password": "wrong-password"}
    for _ in range(5):
        resp = await client.post("/auth/login", json=payload)
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    resp = await client.post("/auth/login", json=payload)
    assert resp.status_code == status.HTTP_429_TOO_MANY_REQUESTS


# --- Linking ---

@pytest.mark.asyncio
@pytest.mark.parametrize("team", ["55555", "https://fantasy.premierleague.com/entry/55555/event/7"])
async def test_link_team_by_id_or_url(client, override_get_adapter, mock_fpl_adapter, team):
    mock_fpl_adapter.get_entry.return_value = ENTRY
    headers = await _signup(client)

    resp = await client.post("/fpl/link", json={"team": team}, headers=headers)
    assert resp.status_code == status.HTTP_200_OK, resp.text
    body = resp.json()
    assert body["user"]["fpl_manager_id"] == 55555
    assert body["user"]["fpl_verified"] is False
    assert body["team"] == {
        "manager_id": 55555,
        "team_name": "Solio Moose",
        "manager_name": "Chris Musson",
        "overall_points": 463,
    }


@pytest.mark.asyncio
async def test_link_rejects_unparseable_input(client, override_get_adapter):
    headers = await _signup(client)
    resp = await client.post("/fpl/link", json={"team": "my team"}, headers=headers)
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_link_unknown_team_404(client, override_get_adapter, mock_fpl_adapter):
    mock_fpl_adapter.get_entry.side_effect = FPLEntryNotFound("/entry/1/")
    headers = await _signup(client)
    resp = await client.post("/fpl/link", json={"team": "1"}, headers=headers)
    assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.asyncio
async def test_link_team_already_owned_by_someone_else(client, override_get_adapter, mock_fpl_adapter):
    mock_fpl_adapter.get_entry.return_value = ENTRY
    first = await _signup(client, email="first@test.com")
    second = await _signup(client, email="second@test.com")

    assert (await client.post("/fpl/link", json={"team": "55555"}, headers=first)).status_code == 200
    resp = await client.post("/fpl/link", json={"team": "55555"}, headers=second)
    assert resp.status_code == status.HTTP_409_CONFLICT


@pytest.mark.asyncio
async def test_relinking_a_different_team_resets_verification(client, override_get_adapter, mock_fpl_adapter, db_session: AsyncSession):
    mock_fpl_adapter.get_entry.return_value = ENTRY
    headers = await _signup(client)
    await client.post("/fpl/link", json={"team": "55555"}, headers=headers)

    user = (await db_session.execute(select(models.User).where(models.User.email == TEST_EMAIL))).scalars().one()
    user.fpl_verified = True
    await db_session.commit()

    same = await client.post("/fpl/link", json={"team": "55555"}, headers=headers)
    assert same.json()["user"]["fpl_verified"] is True

    other = await client.post("/fpl/link", json={"team": "66666"}, headers=headers)
    assert other.json()["user"]["fpl_manager_id"] == 66666
    assert other.json()["user"]["fpl_verified"] is False


# --- Verification ---

@pytest.mark.asyncio
async def test_verification_status_reports_league_code(client, override_get_adapter, verification_league):
    headers = await _signup(client)
    resp = await client.get("/fpl/verification", headers=headers)
    assert resp.json() == {"linked": False, "verified": False, "league_code": VERIFICATION_LEAGUE_CODE}


@pytest.mark.asyncio
async def test_verify_requires_linked_team(client, override_get_adapter, verification_league):
    headers = await _signup(client)
    resp = await client.post("/fpl/verify", headers=headers)
    assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_verify_fails_until_team_joins_league(client, override_get_adapter, mock_fpl_adapter, verification_league):
    mock_fpl_adapter.get_entry.return_value = ENTRY
    headers = await _signup(client)
    await client.post("/fpl/link", json={"team": "55555"}, headers=headers)

    resp = await client.post("/fpl/verify", headers=headers)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST

    mock_fpl_adapter.get_entry.return_value = _entry_in_league(VERIFICATION_LEAGUE_ID)
    resp = await client.post("/fpl/verify", headers=headers)
    assert resp.status_code == status.HTTP_200_OK, resp.text
    assert resp.json()["fpl_verified"] is True
    # Verification must read fresh data, not the 1hr entry cache
    mock_fpl_adapter.get_entry.assert_awaited_with(55555, use_cache=False)


@pytest.mark.asyncio
async def test_verify_unavailable_when_league_not_configured(client, override_get_adapter, mock_fpl_adapter, monkeypatch):
    monkeypatch.setattr(settings, "FPL_VERIFICATION_LEAGUE_ID", None)
    mock_fpl_adapter.get_entry.return_value = ENTRY
    headers = await _signup(client)
    await client.post("/fpl/link", json={"team": "55555"}, headers=headers)

    resp = await client.post("/fpl/verify", headers=headers)
    assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE


@pytest.mark.asyncio
async def test_verify_is_rate_limited_per_user(client, override_get_adapter, mock_fpl_adapter, verification_league):
    mock_fpl_adapter.get_entry.return_value = ENTRY
    headers = await _signup(client)
    await client.post("/fpl/link", json={"team": "55555"}, headers=headers)

    for _ in range(10):
        assert (await client.post("/fpl/verify", headers=headers)).status_code == status.HTTP_400_BAD_REQUEST
    resp = await client.post("/fpl/verify", headers=headers)
    assert resp.status_code == status.HTTP_429_TOO_MANY_REQUESTS


# --- Public / picks ---

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
async def test_get_my_picks_success(client, override_get_adapter, mock_fpl_adapter, make_user):
    user = await make_user(verified=False)
    resp = await client.get("/fpl/my-picks/10", headers=user["headers"])
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["picks"] == [1, 2, 3]
    mock_fpl_adapter.get_entry_picks.assert_awaited_once_with(800001, 10)


@pytest.mark.asyncio
async def test_get_my_picks_requires_linked_team(client, override_get_adapter, make_user):
    user = await make_user(linked=False)
    resp = await client.get("/fpl/my-picks/10", headers=user["headers"])
    assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_get_my_picks_unauthorized_no_jwt(client, override_get_adapter):
    resp = await client.get("/fpl/my-picks/10")
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


# --- League / payment gating ---

async def _paid_and_free_league_codes(client, auth_headers):
    paid = await client.post("/leagues/", json={"name": "Paid", "entry_fee_cents": 50000}, headers=auth_headers)
    free = await client.post("/leagues/", json={"name": "Free"}, headers=auth_headers)
    assert paid.status_code == free.status_code == status.HTTP_201_CREATED
    return paid.json(), free.json()


@pytest.mark.asyncio
async def test_unlinked_user_cannot_join_any_league(client, auth_headers, make_user):
    paid, free = await _paid_and_free_league_codes(client, auth_headers)
    user = await make_user(linked=False)
    for league in (paid, free):
        resp = await client.post("/leagues/join", json={"code": league["code"]}, headers=user["headers"])
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_unverified_user_can_join_free_but_not_paid_league(client, auth_headers, make_user):
    paid, free = await _paid_and_free_league_codes(client, auth_headers)
    user = await make_user(verified=False)

    resp = await client.post("/leagues/join", json={"code": free["code"]}, headers=user["headers"])
    assert resp.status_code == status.HTTP_200_OK

    resp = await client.post("/leagues/join", json={"code": paid["code"]}, headers=user["headers"])
    assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_unverified_user_cannot_create_paid_league(client, override_get_adapter, make_user):
    user = await make_user(verified=False)
    resp = await client.post("/leagues/", json={"name": "Paid", "entry_fee_cents": 50000}, headers=user["headers"])
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    resp = await client.post("/leagues/", json={"name": "Free"}, headers=user["headers"])
    assert resp.status_code == status.HTTP_201_CREATED


@pytest.mark.asyncio
async def test_unverified_user_cannot_contribute(client, auth_headers, create_league, make_user):
    user = await make_user(verified=False)
    resp = await client.post(
        "/payments/leagues/contribute",
        json={"league_id": create_league["id"], "amount_cents": 1000},
        headers=user["headers"],
    )
    assert resp.status_code == status.HTTP_403_FORBIDDEN
