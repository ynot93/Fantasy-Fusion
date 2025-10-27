# app/tests/admin/test_adjust_balance.py
import pytest

@pytest.mark.asyncio
async def test_adjust_balance_credits_wallet(client, admin_headers, make_user):
    user = make_user()  # fixture returns a user dict/model
    r = await client.patch(f"/admin/users/{user['id']}/balance",
                           json={"delta_cents": 1500, "reason": "manual credit"},
                           headers=admin_headers)
    assert r.status_code == 200
    w = await client.get("/payments/wallet", headers=user["headers"])
    assert w.json()["balance_cents"] == 1500
