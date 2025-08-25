from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.api.deps import get_current_user
from app.db.payments.service import PaymentsService
from app.db.payments import schemas as ps
from app.db.payments.models import Provider

router = APIRouter(prefix="/payments", tags=["payments"])

def get_payments_service() -> PaymentsService:
    # wire real providers here (mpesa_provider, paypal_provider, stripe_provider)
    from ...db.payments.providers.fake import FakeProvider  # placeholder for dev/tests
    return PaymentsService({
        "MPESA": FakeProvider("MPESA"),
        "PAYPAL": FakeProvider("PAYPAL"),
        "STRIPE": FakeProvider("STRIPE"),
    })

@router.get("/wallet", response_model=ps.WalletResponse)
async def get_wallet(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    from ...db.payments.crud import get_or_create_wallet
    w = await get_or_create_wallet(db, user.id)
    return w

@router.post("/wallet/deposit", response_model=ps.DepositInitResponse, status_code=201)
async def deposit(req: ps.DepositRequest, db: AsyncSession = Depends(get_db), svc: PaymentsService = Depends(get_payments_service), user=Depends(get_current_user)):
    tx, meta = await svc.init_deposit(db, user_id=user.id, amount_cents=req.amount_cents, currency="KES", provider=req.provider, idempotency_key=req.idempotency_key)
    return ps.DepositInitResponse(transaction_id=tx.id, status=tx.status.value, provider_client_secret=meta.get("client_secret"))

@router.post("/wallet/withdraw", status_code=201)
async def withdraw(req: ps.WithdrawRequest, db: AsyncSession = Depends(get_db), svc: PaymentsService = Depends(get_payments_service), user=Depends(get_current_user)):
    tx = await svc.withdraw(db, user_id=user.id, amount_cents=req.amount_cents, provider=req.provider, destination=req.destination, idempotency_key=req.idempotency_key)
    return {"transaction_id": tx.id, "status": tx.status.value}

@router.post("/leagues/contribute", status_code=201)
async def contribute(req: ps.LeagueContributionRequest, db: AsyncSession = Depends(get_db), svc: PaymentsService = Depends(get_payments_service), user=Depends(get_current_user)):
    tx = await svc.contribute_to_league(db, user_id=user.id, league_id=req.league_id, amount_cents=req.amount_cents)
    return {"transaction_id": tx.id, "status": tx.status.value}

@router.post("/leagues/payout", status_code=201)
async def payout(req: ps.PayoutRequest, db: AsyncSession = Depends(get_db), svc: PaymentsService = Depends(get_payments_service), user=Depends(get_current_user)):
    # authorize only league admin in real code; here we assume authorized
    try:
        tx = await svc.payout_winner(db, league_id=req.league_id, winner_user_id=req.winner_user_id)
        return {"transaction_id": tx.id, "status": tx.status.value, "amount_cents": tx.amount_cents}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
