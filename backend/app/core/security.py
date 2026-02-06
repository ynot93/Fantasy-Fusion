from fastapi import Request
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
from app.core.config import settings
import base64, httpx, stripe, time

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
stripe.api_key = settings.STRIPE_SECRET_KEY

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + expires_delta
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)

def create_access_token(data: dict):
    return create_token(data, timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))

def create_refresh_token(data: dict):
    return create_token(data, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))

def decode_token(token: str):
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM])

async def get_mpesa_access_token():
    consumer_key = settings.MPESA_CONSUMER_KEY
    consumer_secret = settings.MPESA_CONSUMER_SECRET
    
    auth_string = f"{consumer_key}:{consumer_secret}"
    encoded_auth_string = base64.b64encode(auth_string.encode()).decode()
    
    url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    headers = {"Authorization": f"Basic {encoded_auth_string}"}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        return response.json()["access_token"]

def stk_password(shortcode: str, passkey: str, timestamp: str) -> str:
    raw = f"{shortcode}{passkey}{timestamp}".encode()
    return base64.b64encode(raw).decode()

async def get_pesapal_token() -> str:
        now = time.time()
        exp_ts: float = 0.0
        if token and now < exp_ts:
            return token
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{settings.PESAPAL_BASE_URL}/api/Auth/RequestToken",
                json={
                    "consumer_key": settings.PESAPAL_CONSUMER_KEY,
                    "consumer_secret": settings.PESAPAL_CONSUMER_SECRET
                }
            )
            resp.raise_for_status()
            data = resp.json()
            token = data["token"]
            # sandbox gives e.g. 3600s expiry
            exp_ts = now + int(data.get("expiry", 3000))
            return token

# --- Utility to get the raw request body for webhook verification ---
async def get_body(request: Request) -> bytes:
    """Helper to get the raw request body."""
    return await request.body()