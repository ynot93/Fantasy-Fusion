from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.api.deps import get_db
from app.api.deps import get_current_user
from app.db.payments.service import PaymentsService
from app.db.payments import schemas as PaymentSchema
from app.db.payments.models import Provider

router = APIRouter()

def get_payments_service() -> PaymentsService:
    from ...db.payments.providers.mpesa_provider import MpesaProvider
    from ...db.payments.providers.stripe_provider import StripeProvider

    return PaymentsService({
        "MPESA": MpesaProvider(),
        "STRIPE": StripeProvider(),
    })

@router.get("/wallet", response_model=PaymentSchema.WalletResponse)
async def get_wallet(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    from ...db.payments.crud import get_or_create_wallet
    wallet = await get_or_create_wallet(db, user.id)
    return wallet

@router.get("/transactions", response_model=List[PaymentSchema.TransactionResponse])
async def list_transactions(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    from ...db.payments.crud import list_transactions_for_user
    return await list_transactions_for_user(db, user.id, limit=limit, offset=offset)

@router.post("/wallet/deposit", response_model=PaymentSchema.DepositInitResponse, status_code=201)
async def deposit(
    req: PaymentSchema.DepositRequest,
    db: AsyncSession = Depends(get_db),
    svc: PaymentsService = Depends(get_payments_service),
    user=Depends(get_current_user)
):
    tx, meta = await svc.init_deposit(
        db,
        user_id=user.id,
        amount_cents=req.amount_cents,
        currency=req.currency,
        provider=req.provider,
        idempotency_key=req.idempotency_key
    )
    return PaymentSchema.DepositInitResponse(
        transaction_id=tx.id,
        status=tx.status.value,
        provider_client_secret=meta.get("client_secret")
    )

@router.post("/wallet/withdraw", status_code=201)
async def withdraw(
    req: PaymentSchema.WithdrawRequest,
    db: AsyncSession = Depends(get_db),
    svc: PaymentsService = Depends(get_payments_service),
    user=Depends(get_current_user)
):
    try:
        tx, meta = await svc.withdraw(
            db,
            user_id=user.id,
            amount_cents=req.amount_cents,
            provider=req.provider,
            destination=req.destination,
            idempotency_key=req.idempotency_key
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    
    return {"transaction_id": tx.id, "provider_ref": tx.provider_ref, "status": tx.status.value, **(meta or {})}

@router.post("/leagues/contribute", status_code=201)
async def contribute(
    req: PaymentSchema.LeagueContributionRequest,
    db: AsyncSession = Depends(get_db),
    svc: PaymentsService = Depends(get_payments_service),
    user=Depends(get_current_user)
):
    tx = await svc.contribute_to_league(
        db,
        user_id=user.id,
        league_id=req.league_id,
        amount_cents=req.amount_cents
    )
    return {"transaction_id": tx.id, "status": tx.status.value}

@router.post("/leagues/payout", status_code=201)
async def payout(
    req: PaymentSchema.PayoutRequest,
    db: AsyncSession = Depends(get_db),
    svc: PaymentsService = Depends(get_payments_service),
    user=Depends(get_current_user)
):
    # authorize only league admin in real code; here we assume authorized
    try:
        tx = await svc.payout_winner(db, league_id=req.league_id, winner_user_id=req.winner_user_id)
        return {"transaction_id": tx.id, "status": tx.status.value, "amount_cents": tx.amount_cents}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
