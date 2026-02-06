from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.db.payments.service import PaymentsService
from app.api.routes.payments import get_payments_service

router = APIRouter()

@router.post("/ipn")
async def pesapal_ipn(
    request: Request,
    db: AsyncSession = Depends(get_db),
    svc: PaymentsService = Depends(get_payments_service),
):
    body = await request.json()
    # Depending on IPN config, Pesapal sends order_tracking_id + status.
    provider_ref = body.get("order_tracking_id")
    status = body.get("status")  # e.g., COMPLETED, FAILED

    if not provider_ref:
        raise HTTPException(status_code=400, detail="No provider_ref")

    if status in ("COMPLETED", "PAID", "SUCCESS"):
        await svc.on_deposit_succeeded(db, provider="PESAPAL", provider_ref=provider_ref)
    elif status in ("FAILED", "CANCELLED"):
        await svc.on_deposit_failed(db, provider="PESAPAL", provider_ref=provider_ref, error=status)
    else:
        # PENDING/UNKNOWN → do nothing; you'll get another post or poll
        pass

    return {"message": "Pesapal IPN processed"}
