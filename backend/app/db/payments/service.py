from app.db.payments.interfaces import PaymentProvider
from app.db.payments.models import TxType, TxStatus, Provider, LeaguePot
from app.db.payments import crud as pay_crud
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.payments.models import Transaction
from typing import Optional

class PaymentsService:
    def __init__(self, provider_map: dict[str, PaymentProvider]):
        self.providers = provider_map

    async def init_deposit(self, db: AsyncSession, *, user_id: int, amount_cents: int, currency: str, provider: str, idempotency_key: str | None):
        prov = self.providers[provider]
        tx = await pay_crud.create_tx(
            db,
            user_id=user_id,
            type=TxType.DEPOSIT,
            provider=provider,
            amount_cents=amount_cents,
            currency=currency,
            status=TxStatus.PENDING,
            idempotency_key=idempotency_key,
        )
        meta = await prov.create_deposit(
            user_id=user_id,
            amount_cents=amount_cents,
            currency=currency,
            idempotency_key=idempotency_key,
        )
        tx.provider_ref = meta.get("provider_ref")
        await db.commit()
        await db.refresh(tx)
        return tx, meta

    async def confirm_deposit(self, db: AsyncSession, *, provider: str, provider_ref: str):
        # Convenience for providers with capture API (Stripe)
        prov = self.providers[provider]
        result = await prov.capture_deposit(provider_ref)
        # On success, credit wallet
        # Load tx by provider+provider_ref
        # After capture, mark succeeded via on_deposit_succeeded
        # Many providers return status; but webhook is preferred
        await self.on_deposit_succeeded(db, provider=provider, provider_ref=provider_ref, amount_cents=None)
        return await pay_crud.get_tx_by_provider_ref(db, provider, provider_ref)

    async def withdraw(self, db: AsyncSession, *, user_id: int, amount_cents: int, provider: str, destination: str, idempotency_key: str | None):
        prov = self.providers[provider]
        # deduct first (holds funds)
        await pay_crud.adjust_wallet_balance(db, user_id, -amount_cents)
        tx = await pay_crud.create_tx(
            db,
            user_id=user_id,
            type=TxType.WITHDRAW,
            provider=provider,
            amount_cents=amount_cents,
            currency="KES",
            status=TxStatus.PENDING,
            idempotency_key=idempotency_key,
        )
        try:
            meta = await prov.payout(user_id=user_id, amount_cents=amount_cents, destination=destination, idempotency_key=idempotency_key)
        except Exception as exc:
            # refund on immediate failure
            await pay_crud.adjust_wallet_balance(db, user_id, amount_cents)
            tx.status = TxStatus.FAILED
            tx.error = str(exc)
            await db.commit()
            await db.refresh(tx)
            raise
        tx.provider_ref = meta.get("provider_ref")
        db.add(tx)
        # keep tx pending; finalize via webhook
        await db.commit()
        await db.refresh(tx)
        return tx, meta

    async def on_withdraw_succeeded(self, db: AsyncSession, *, provider: str, provider_ref: str):
        tx = await pay_crud.get_tx_by_provider_ref(db, provider, provider_ref)
        if not tx:
            return None
        if tx.status == TxStatus.SUCCEEDED:
            return tx
        await pay_crud.set_tx_status(db, tx, TxStatus.SUCCEEDED)
        await db.commit()
        await db.refresh(tx)
        return tx

    async def on_withdraw_failed(self, db: AsyncSession, *, provider: str, provider_ref: str, error: Optional[str] = None):
        tx = await pay_crud.get_tx_by_provider_ref(db, provider, provider_ref)
        if not tx:
            return None
        if tx.status == TxStatus.SUCCEEDED:
            # already paid; too late to refund automatically
            return tx
        # refund the held funds
        await pay_crud.adjust_wallet_balance(db, tx.user_id, tx.amount_cents)
        tx.error = error
        await pay_crud.set_tx_status(db, tx, TxStatus.FAILED)
        await db.commit()
        await db.refresh(tx)
        return tx

    async def contribute_to_league(self, db: AsyncSession, *, user_id: int, league_id: int, amount_cents: int, house_cut_bps: int = 1000):
        # deduct from wallet
        await pay_crud.adjust_wallet_balance(db, user_id, -amount_cents)
        # add to pot (+house split)
        await pay_crud.adjust_league_pot(db, league_id, amount_cents, house_cut_bps)
        # record tx
        tx = await pay_crud.create_tx(
            db,
            user_id=user_id,
            league_id=league_id,
            type=TxType.LEAGUE_CONTRIBUTION,
            provider=None,
            amount_cents=amount_cents,
            currency="KES",
            status=TxStatus.SUCCEEDED,
        )
        await db.commit()
        await db.refresh(tx)
        return tx

    async def payout_winner(self, db: AsyncSession, *, league_id: int, winner_user_id: int):
        # pay out full pot to winner (house already skimmed on each contribution)
        pot = await db.get(LeaguePot, league_id, with_for_update={"nowait": False, "read": False})
        if not pot or pot.pot_cents <= 0:
            raise ValueError("No pot available")
        amount = pot.pot_cents
        pot.pot_cents = 0
        await pay_crud.adjust_wallet_balance(db, winner_user_id, amount)
        tx = await pay_crud.create_tx(
            db,
            user_id=winner_user_id,
            league_id=league_id,
            type=TxType.PAYOUT,
            provider=None,
            amount_cents=amount,
            currency="KES",
            status=TxStatus.SUCCEEDED,
        )
        await db.commit()
        await db.refresh(tx)
        return tx
    
    async def on_deposit_succeeded(self, db: AsyncSession, *, provider: str, provider_ref: str, amount_cents: int | None = None):
        tx = (await db.execute(
            select(Transaction).where(Transaction.provider == provider, Transaction.provider_ref == provider_ref)
        )).scalars().first()
        if not tx:
            # (Optional) create a shadow record or log an error
            return None
        if tx.status == TxStatus.SUCCEEDED:
            return tx  # idempotent
        if amount_cents is not None and tx.amount_cents != amount_cents:
            # depending on provider rounding/fees you may relax this
            pass
        await pay_crud.adjust_wallet_balance(db, tx.user_id, tx.amount_cents)
        await pay_crud.set_tx_status(db, tx, TxStatus.SUCCEEDED)
        await db.commit()
        await db.refresh(tx)
        return tx

    async def on_deposit_failed(self, db: AsyncSession, *, provider: str, provider_ref: str, error: str | None = None):
        tx = (await db.execute(
            select(Transaction).where(Transaction.provider == provider, Transaction.provider_ref == provider_ref)
        )).scalars().first()
        if not tx:
            return None
        if tx.status != TxStatus.SUCCEEDED:
            tx.error = error
            await pay_crud.set_tx_status(db, tx, TxStatus.FAILED)
            await db.commit()
            await db.refresh(tx)
        return tx