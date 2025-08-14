import pytest_asyncio
import pytest

@pytest.mark.asyncio
async def test_create_league(client, auth_headers):
    payload = {"name": "New League"}
    response = await client.post("/leagues/", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New League"
    assert "code" in data

@pytest.mark.asyncio
async def test_join_league(client, auth_headers, create_league):
    league = create_league
    code = league["code"]
    response = await client.post("/leagues/join", json={"code": code}, headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["code"] == code

@pytest.mark.asyncio
async def test_get_league(client, auth_headers, create_league):
    league = create_league
    league_id = league["id"]
    response = await client.get(f"/leagues/{league_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == league_id
