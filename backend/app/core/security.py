from fastapi import Request
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
from app.core.config import settings
import base64, hashlib, hmac, httpx, stripe

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

# --- Password reset tokens ---
# Signed with a separate derived key so a reset token can never be used as a
# bearer token (decode_token rejects it) and an access token can never reset a
# password. The token also carries a fingerprint of the current password hash,
# so it stops working as soon as the password changes - i.e. it is single-use,
# without needing a tokens table.
_RESET_PURPOSE = "password_reset"


def _reset_signing_key() -> str:
    return f"{settings.JWT_SECRET_KEY}:{_RESET_PURPOSE}"


def _password_fingerprint(hashed_password: str) -> str:
    return hashlib.sha256(hashed_password.encode()).hexdigest()[:32]


def create_password_reset_token(user_id: int, hashed_password: str) -> str:
    claims = {
        "sub": str(user_id),
        "purpose": _RESET_PURPOSE,
        "pwd": _password_fingerprint(hashed_password),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES),
    }
    return jwt.encode(claims, _reset_signing_key(), algorithm=settings.ALGORITHM)


def read_password_reset_token(token: str) -> tuple[int, str] | None:
    """Returns (user_id, password_fingerprint) for a valid, unexpired reset token, else None.
    The caller must still check the fingerprint against the user's current hash."""
    try:
        payload = jwt.decode(token, _reset_signing_key(), algorithms=[settings.ALGORITHM])
        if payload.get("purpose") != _RESET_PURPOSE:
            return None
        return int(payload["sub"]), payload["pwd"]
    except (JWTError, KeyError, TypeError, ValueError):
        return None


def password_fingerprint_matches(hashed_password: str, fingerprint: str) -> bool:
    return hmac.compare_digest(_password_fingerprint(hashed_password), fingerprint)

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

# --- Utility to get the raw request body for webhook verification ---
async def get_body(request: Request) -> bytes:
    """Helper to get the raw request body."""
    return await request.body()