from fastapi import APIRouter, Depends, HTTPException, Request
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

@router.post("/callback")
async def mpesa_callback(request: Request):
    """
    Endpoint to handle M-Pesa payment callbacks.
    """
    data = await request.json()
    # Process the callback data here
    # Check ResultCode for success (0) or failure
    # Use the MerchantRequestID or CheckoutRequestID to match with your transaction
     # Example: Check for success
    if data["Body"]["stkCallback"]["ResultCode"] == 0:
        # Transaction was successful. Update your user's balance in the database.
        # Use the data["Body"]["stkCallback"]["CallbackMetadata"]["Item"] to get details
        # Log the transaction details for auditing
        print("Successful transaction:", data)
    else:
        # Transaction failed. Log the error.
        print("Failed transaction:", data)

    return {"message": "Callback received"}

@router.post("/withdraw")
async def initiate_b2c_withdrawal(phone_number: str, amount: int):
    # Get access token
    access_token = await get_mpesa_access_token()
    
    # You need to encrypt the initiator password using the Safaricom B2C certificate
    # This process is complex and often done using a dedicated library or a separate script.
    # For this example, let's assume you have a function that returns the encrypted password.
    # encrypted_password = encrypt_initiator_password(settings.INITIATOR_PASSWORD)
    
    payload = {
        "InitiatorName": settings.INITIATOR_NAME,
        "SecurityCredential": "your_encrypted_password",
        "CommandID": "BusinessPayment",
        "Amount": amount,
        "PartyA": settings.SHORTCODE,
        "PartyB": phone_number,
        "Remarks": "Withdrawal from app",
        "QueueTimeOutURL": "https://your-domain.com/api/v1/mpesa/b2c/timeout", # Your webhook for timeout
        "ResultURL": "https://your-domain.com/api/v1/mpesa/b2c/result" # Your webhook for result
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    url = "https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.json())
        
        return {"message": "Withdrawal request submitted successfully."}