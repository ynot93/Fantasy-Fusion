# app/tests/admin/test_rbac.py
import pytest

@pytest.mark.asyncio
async def test_admin_route_forbidden_for_normal_user(client, auth_headers):
    r = await client.get("/admin/health", headers=auth_headers)
    assert r.status_code == 403

@pytest.mark.asyncio
async def test_admin_route_ok_for_admin(client, admin_headers):
    r = await client.get("/admin/health", headers=admin_headers)
    assert r.status_code == 200
