# app/tests/test_payments.py
import pytest
from sqlalchemy import select

from app.db.auth.models import User
from app.db.payments.crud import adjust_wallet_balance

async def _get_user_id(db_session, email="nouser@example.com") -> int:
    user = (
        await db_session.execute(
            select(User).where(User.email == email)
        )
    ).scalars().one()
    return user.id

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
    from app.main import app
    svc: PaymentsService = app.dependency_overrides[get_payments_service]()  # our fake-injected service

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

    # Credit user directly (skip provider/webhook for this test)
    user_id = await _get_user_id(db_session, email="nouser@example.com")
    await adjust_wallet_balance(db_session, user_id, 10_000)
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
    # Credit user first
    user_id = await _get_user_id(db_session, email="nouser@example.com")
    await adjust_wallet_balance(db_session, user_id, 8000)
    # withdraw
    r = await client.post("/payments/wallet/withdraw", json={
        "amount_cents": 3000,
        "provider": "PAYPAL",
        "destination": "payer@example.com"
    }, headers=auth_headers)
    assert r.status_code == 201

    r2 = await client.get("/payments/wallet", headers=auth_headers)
    assert r2.json()["balance_cents"] == 5000 # 8000 - 3000

@pytest.mark.asyncio
async def test_payout_winner_zeroes_pot_and_credits_wallet(client, auth_headers, create_league, db_session):
    league = create_league
    
    # Get user id
    user_id = await _get_user_id(db_session, email="nouser@example.com")

    # Preload wallet and contribute 10,000
    await adjust_wallet_balance(db_session, user_id, 20_000)
    r_contrib = await client.post(
        "/payments/leagues/contribute",
        json={"league_id": league["id"], "amount_cents": 10000},
        headers=auth_headers
    )
    assert r_contrib.status_code == 201

    r = await client.post(
        "/payments/leagues/payout",
        json={"league_id": league["id"], "winner_user_id": user_id},
        headers=auth_headers
    )
    assert r.status_code == 201
    amt = r.json()["amount_cents"]
    assert amt == 9000  # 10% was skimmed, so 9k pot

    # wallet should be: 20k - 10k + 9k = 19k
    r2 = await client.get("/payments/wallet", headers=auth_headers)
    assert r2.json()["balance_cents"] == 19000

@pytest.mark.asyncio
async def test_deposit_webhook_is_idempotent(client, auth_headers, db_session):
    """
    1) Init deposit (PENDING).
    2) Simulate provider webhook (on_deposit_succeeded) twice.
    3) Wallet should be credited only once.
    """
    # init deposit
    amount = 25000
    resp = await client.post("/payments/wallet/deposit", json={
        "amount_cents": amount,
        "provider": "STRIPE",
        "idempotency_key": "dep-web-idemp"
    }, headers=auth_headers)
    assert resp.status_code == 201
    tx_id = resp.json()["transaction_id"]

    # simulate provider webhook calling confirm_deposit
    from app.db.payments.service import PaymentsService
    from app.api.routes.payments import get_payments_service
    from app.main import app

    # you need provider_ref from db: fetch tx by id
    from sqlalchemy import select
    from app.db.payments.models import Transaction

    # fetch transaction and provider_ref
    tx = (await db_session.execute(select(Transaction).where(Transaction.id == tx_id))).scalars().one()
    provider = tx.provider.value
    provider_ref = tx.provider_ref

    # get service instance from DI
    svc: PaymentsService = app.dependency_overrides[get_payments_service]()

    # call webhook handler twice (simulate duplicate webhook)
    await svc.on_deposit_succeeded(db_session, provider=provider, provider_ref=provider_ref)
    # second call must be a no-op (idempotent)
    await svc.on_deposit_succeeded(db_session, provider=provider, provider_ref=provider_ref)

    # wallet balance should be equal to amount (not doubled)
    r2 = await client.get("/payments/wallet", headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json()["balance_cents"] == amount


@pytest.mark.asyncio
async def test_withdraw_pending_and_finalize_success(client, auth_headers, db_session):
    """
    Ensure withdraw:
    - debits wallet immediately (hold),
    - tx.status remains PENDING after withdraw,
    - on_withdraw_succeeded marks tx SUCCEEDED but does not alter already-debited balance.
    """
    user_id = await _get_user_id(db_session, email="nouser@example.com")
    # preload wallet
    from app.db.payments.crud import adjust_wallet_balance
    await adjust_wallet_balance(db_session, user_id, 8000)

    # initiate withdraw
    resp = await client.post("/payments/wallet/withdraw", json={
        "amount_cents": 3000,
        "provider": "MPESA",  # use any provider key wired in tests
        "destination": "254700000000",
        "idempotency_key": "wd-success-1"
    }, headers=auth_headers)
    assert resp.status_code == 201
    tx_id = resp.json()["transaction_id"]
    provider_ref = resp.json().get("provider_ref")

    # after withdraw request, wallet should already be debited
    r = await client.get("/payments/wallet", headers=auth_headers)
    assert r.json()["balance_cents"] == 5000

    # simulate provider webhook calling confirm_deposit
    from app.db.payments.service import PaymentsService
    from app.api.routes.payments import get_payments_service
    from app.main import app

    # you need provider_ref from db: fetch tx by id
    from sqlalchemy import select
    from app.db.payments.models import Transaction

    # verify tx is PENDING in DB
    tx = (await db_session.execute(select(Transaction).where(Transaction.id == tx_id))).scalars().one()
    assert tx.status.value == "PENDING"

    # finalize via service webhook success
    svc: PaymentsService = app.dependency_overrides[get_payments_service]()
    # provider_ref might be None for tests depending on FakeProvider; fall back to tx.provider_ref
    pr = provider_ref or tx.provider_ref
    await svc.on_withdraw_succeeded(db_session, provider=tx.provider.value, provider_ref=pr)

    # tx should now be SUCCEEDED and wallet balance unchanged (already debited at withdraw)
    tx2 = (await db_session.execute(select(Transaction).where(Transaction.id == tx_id))).scalars().one()
    assert tx2.status.value == "SUCCEEDED"
    r2 = await client.get("/payments/wallet", headers=auth_headers)
    assert r2.json()["balance_cents"] == 5000


@pytest.mark.asyncio
async def test_withdraw_pending_and_finalize_failure_refunds(client, auth_headers, db_session):
    """
    If provider reports withdrawal failure, held funds should be refunded.
    """
    user_id = await _get_user_id(db_session, email="nouser@example.com")
    from app.db.payments.crud import adjust_wallet_balance
    await adjust_wallet_balance(db_session, user_id, 9000)

    # initiate withdraw
    resp = await client.post("/payments/wallet/withdraw", json={
        "amount_cents": 4000,
        "provider": "MPESA",
        "destination": "254700000001",
        "idempotency_key": "wd-fail-1"
    }, headers=auth_headers)
    assert resp.status_code == 201
    tx_id = resp.json()["transaction_id"]

    # wallet debited immediately
    r = await client.get("/payments/wallet", headers=auth_headers)
    assert r.json()["balance_cents"] == 5000  # 9000 - 4000

    # simulate provider webhook calling confirm_deposit
    from app.db.payments.service import PaymentsService
    from app.api.routes.payments import get_payments_service
    from app.main import app

    # you need provider_ref from db: fetch tx by id
    from sqlalchemy import select
    from app.db.payments.models import Transaction

    # simulate provider telling us the withdraw failed
    tx = (await db_session.execute(select(Transaction).where(Transaction.id == tx_id))).scalars().one()
    svc: PaymentsService = app.dependency_overrides[get_payments_service]()
    provider_ref = tx.provider_ref or "fake-ref-for-test"
    await svc.on_withdraw_failed(db_session, provider=tx.provider.value, provider_ref=provider_ref, error="network failure")

    # tx should be FAILED and wallet refunded
    tx2 = (await db_session.execute(select(Transaction).where(Transaction.id == tx_id))).scalars().one()
    assert tx2.status.value == "FAILED"
    r2 = await client.get("/payments/wallet", headers=auth_headers)
    assert r2.json()["balance_cents"] == 9000  # refunded


@pytest.mark.asyncio
async def test_withdraw_insufficient_funds(client, auth_headers):
    """
    Attempt to withdraw when balance is zero. Expect HTTP 400.
    """
    resp = await client.post("/payments/wallet/withdraw", json={
        "amount_cents": 1000,
        "provider": "MPESA",
        "destination": "254700000002"
    }, headers=auth_headers)
    assert resp.status_code == 400