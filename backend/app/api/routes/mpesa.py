from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_mpesa_access_token
from app.core.config import settings
import httpx, time, base64

router = APIRouter(prefix="/mpesa", tags=["payments"])

@router.get("/deposit")
async def deposit(phone_number: str, amount: int):
    """
    Endpoint to initiate an M-Pesa deposit."""
    access_token = await get_mpesa_access_token()
    if not access_token:
        raise HTTPException(status_code=500, detail="Failed to retrieve M-Pesa access token")
    
    # Generate timestamp and password
    timestamp = time.strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(f"{settings.MPESA_SHORTCODE}{settings.PASS_KEY}{timestamp}".encode()).decode()
    
    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone_number,
        "PartyB": settings.MPESA_SHORTCODE,
        "PhoneNumber": phone_number,
        "CallBackURL": "https://your-domain.com/api/v1/mpesa/callback", # Your public webhook URL
        "AccountReference": "Fantasy Fusion",
        "TransactionDesc": "Payment for service"
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.json())
        
        return {"message": "STK push initiated successfully."}