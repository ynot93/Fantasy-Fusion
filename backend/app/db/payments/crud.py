from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, literal_column
from sqlalchemy.orm import selectinload
from app.db.payments.models import Wallet, Transaction, LeaguePot, TxType, TxStatus, Provider
from sqlalchemy import text

async def get_or_create_wallet(db: AsyncSession, user_id: int) -> Wallet:
    w = await db.get(Wallet, user_id)
    if w: return w
    w = Wallet(user_id=user_id, balance_cents=0)
    db.add(w)
    await db.flush()
    return w

async def create_tx(db: AsyncSession, **kwargs) -> Transaction:
    tx = Transaction(**kwargs)
    db.add(tx)
    await db.flush()
    return tx

async def set_tx_status(db: AsyncSession, tx: Transaction, status: TxStatus, error: str | None = None):
    tx.status = status
    tx.error = error
    await db.flush()
    return tx

# Use a SELECT ... FOR UPDATE to prevent race conditions when changing balances/pots.
async def adjust_wallet_balance(db: AsyncSession, user_id: int, delta_cents: int):
    await db.execute(text("BEGIN"))
    wallet = await db.get(Wallet, user_id, with_for_update={"nowait": False, "read": False})
    if wallet is None:
        wallet = Wallet(user_id=user_id, balance_cents=0)
        db.add(wallet)
        await db.flush()
    new_bal = wallet.balance_cents + delta_cents
    if new_bal < 0:
        raise ValueError("Insufficient funds")
    wallet.balance_cents = new_bal
    await db.flush()
    await db.execute(text("COMMIT"))
    return wallet

async def adjust_league_pot(db: AsyncSession, league_id: int, delta_cents: int, house_cut_bps: int = 1000):
    # house_cut_bps = 1000 → 10%
    pot = await db.get(LeaguePot, league_id, with_for_update={"nowait": False, "read": False})
    if pot is None:
        pot = LeaguePot(league_id=league_id, pot_cents=0, house_cents=0)
        db.add(pot)
        await db.flush()
    # split incoming positive delta into house + pot; negative delta reduces pot only
    if delta_cents >= 0:
        house = (delta_cents * house_cut_bps) // 10000
        pot_delta = delta_cents - house
        pot.pot_cents += pot_delta
        pot.house_cents += house
    else:
        pot.pot_cents += delta_cents
        if pot.pot_cents < 0:
            raise ValueError("Pot cannot be negative")
    await db.flush()
    return pot
