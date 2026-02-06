from fastapi import APIRouter, Depends, HTTPException, Request
from app.core.security import get_mpesa_access_token
from app.core.config import settings
import httpx, time, base64
from app.api.deps import get_db
from app.db.payments.service import PaymentsService
from app.api.routes.payments import get_payments_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

@router.post("/stk-callback")
async def mpesa_stk_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
    svc: PaymentsService = Depends(get_payments_service)
):
    """
    Endpoint to handle M-Pesa payment callbacks.
    """
    body = await request.json()
    stk = body.get("Body", {}).get("stkCallback", {})
    provider_ref = stk.get("CheckoutRequestID")
    result_code = stk.get("ResultCode")

    if not provider_ref:
        raise HTTPException(status_code=400, detail="No provider_ref")

    if result_code == 0:
        # Success → mark tx succeeded, credit wallet
        await svc.on_deposit_succeeded(db, provider="MPESA", provider_ref=provider_ref)
    else:
        await svc.on_deposit_failed(db, provider="MPESA", provider_ref=provider_ref, error=stk.get("ResultDesc"))

    return {"message": "STK Callback received"}

@router.post("/b2c/result")
async def mpesa_b2c_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
    svc: PaymentsService = Depends(get_payments_service)
):
    """
    Endpoint to handle M-Pesa payment callbacks.
    """
    body = await request.json()
    # Map to your withdrawal tx by ConversationID (we used that as provider_ref)
    result = body.get("Result", {})
    provider_ref = result.get("ConversationID")
    code = result.get("ResultCode")
    desc = result.get("ResultDesc")

    if not provider_ref:
        raise HTTPException(status_code=400, detail="No provider_ref")

    if code == 0:
        await svc.on_withdraw_succeeded(db, provider="MPESA", provider_ref=provider_ref)
    else:
        await svc.on_withdraw_failed(db, provider="MPESA", provider_ref=provider_ref, error=desc)

    return {"message": "B2C Callback received"}

@router.post("/b2c/timeout")
async def b2c_timeout(request: Request):
    """
    Endpoint to handle M-Pesa B2C timeout callbacks.
    """
    data = await request.json()
    # Process the timeout data here
    # Log the timeout event for auditing
    print("B2C Timeout:", data)
    
    return {"message": "B2C Timeout received"}
