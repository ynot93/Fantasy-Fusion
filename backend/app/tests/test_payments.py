# app/tests/test_payments.py
import pytest

@pytest.mark.asyncio
async def test_wallet_initial_balance(client, auth_headers):
    r = await client.get("/payments/wallet", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["balance_cents"] == 0

@pytest.mark.asyncio
async def test_deposit_flow_marks_pending_and_confirm_via_webhook(client, auth_headers, db_session):
    # init deposit
    r = await client.post("/payments/wallet/deposit", json={
        "amount_cents": 50000,
        "provider": "STRIPE",
        "idempotency_key": "dep-123"
    }, headers=auth_headers)
    assert r.status_code == 201
    tx_id = r.json()["transaction_id"]

    # simulate provider webhook calling confirm_deposit
    from app.db.payments.service import PaymentsService
    from app.api.routes.payments import get_payments_service
    svc: PaymentsService = client.app.dependency_overrides[get_payments_service]()  # our fake-injected service

    # you need provider_ref from db: fetch tx by id
    from sqlalchemy import select
    from app.db.payments.models import Transaction
    tx = (await db_session.execute(select(Transaction).where(Transaction.id == tx_id))).scalars().one()
    # confirm
    tx2 = await svc.confirm_deposit(db_session, provider=tx.provider.value, provider_ref=tx.provider_ref)
    assert tx2.status.value == "SUCCEEDED"

    # wallet should now be credited
    r2 = await client.get("/payments/wallet", headers=auth_headers)
    assert r2.json()["balance_cents"] == 50000

@pytest.mark.asyncio
async def test_contribute_to_league_updates_pot_and_wallet(client, auth_headers, create_league, db_session):
    league = create_league  # fixture returns dict
    # first, deposit
    await client.post("/payments/wallet/deposit", json={"amount_cents": 10000, "provider":"MPESA"}, headers=auth_headers)
    # directly credit via confirm (skip webhook in this test)
    from app.db.payments.crud import adjust_wallet_balance
    # (or use the service.confirm_deposit flow like above)
    # contribute
    r = await client.post("/payments/leagues/contribute", json={
        "league_id": league["id"],
        "amount_cents": 6000
    }, headers=auth_headers)
    assert r.status_code == 201

    # wallet decreased
    r2 = await client.get("/payments/wallet", headers=auth_headers)
    assert r2.json()["balance_cents"] == 4000  # 10k - 6k

    # pot split check
    from app.db.payments.models import LeaguePot
    pot = await db_session.get(LeaguePot, league["id"])
    assert pot.pot_cents == 5400  # 10% house
    assert pot.house_cents == 600

@pytest.mark.asyncio
async def test_withdraw_checks_balance_and_succeeds(client, auth_headers, db_session):
    # credit user first (simulate successful deposit)
    from app.db.payments.crud import adjust_wallet_balance
    from app.api.deps import get_current_user  # or decode from auth_headers in your helper
    # assume helper to get current user id from token in tests
    user_id = ...  # get from your auth fixture
    await adjust_wallet_balance(db_session, user_id, 8000)

    r = await client.post("/payments/wallet/withdraw", json={
        "amount_cents": 3000,
        "provider": "PAYPAL",
        "destination": "payer@example.com"
    }, headers=auth_headers)
    assert r.status_code == 201

    r2 = await client.get("/payments/wallet", headers=auth_headers)
    assert r2.json()["balance_cents"] == 5000

@pytest.mark.asyncio
async def test_payout_winner_zeroes_pot_and_credits_wallet(client, auth_headers, create_league, db_session):
    league = create_league
    # preload wallet & contribute
    from app.db.payments.crud import adjust_wallet_balance
    user_id = ...  # from auth fixture
    await adjust_wallet_balance(db_session, user_id, 20000)
    await client.post("/payments/leagues/contribute", json={"league_id": league["id"], "amount_cents": 10000}, headers=auth_headers)

    r = await client.post("/payments/leagues/payout", json={
        "league_id": league["id"],
        "winner_user_id": user_id
    }, headers=auth_headers)
    assert r.status_code == 201
    amt = r.json()["amount_cents"]
    assert amt == 9000  # 10% was skimmed, so 9k pot

    # wallet should be: 20k - 10k + 9k = 19k
    r2 = await client.get("/payments/wallet", headers=auth_headers)
    assert r2.json()["balance_cents"] == 19000
