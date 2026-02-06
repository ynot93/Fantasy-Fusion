# app/db/payments/providers/mpesa_provider.py
from __future__ import annotations
from typing import Optional, Dict, Any
import base64, datetime, json
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import stk_password, get_mpesa_access_token
from app.core.config import settings

from app.db.payments.interfaces import PaymentProvider  # your Protocol
from app.db.auth.models import User  # to fetch phone number if not provided in request


class MpesaProvider:
    """
    MPESA STK Push for deposits and B2C for withdrawals.
    - create_deposit: initiate STK Push (CustomerPayBillOnline)
    - capture_deposit: optional query status (STKQuery)
    - payout: B2C Payment to MSISDN
    """
    def __init__(self, db: Optional[AsyncSession] = None):
        self.base = settings.MPESA_SANDBOX_URL
        self.shortcode = settings.MPESA_SHORTCODE
        self.passkey = settings.MPESA_PASSKEY
        self.callback_stk = settings.MPESA_CALLBACK_URL_STK
        self.b2c_shortcode = settings.MPESA_SHORTCODE
        self.callback_b2c = settings.MPESA_CALLBACK_URL_B2C
        self.initiator_name = settings.INITIATOR_NAME
        self.initiator_password = settings.INITIATOR_PASSWORD
        self.security_credential = settings.SECURITY_CREDENTIAL
        self.command_id = settings.COMMAND_ID
        self._db = db  # optional if you want to look up user phone

    async def create_deposit(
        self,
        *,
        user_id: int,
        amount_cents: int,
        currency: str,
        idempotency_key: str | None
    ) -> Dict[str, Any]:
        # Get access token
        access_token = await get_mpesa_access_token()

        # M-Pesa uses shillings; you store cents. Convert.
        if currency.upper() != "KES":
            raise ValueError("M-Pesa only supports KES for STK")
        amount_kes = amount_cents // 100

        # Get phone number (E.164). Prefer to keep it in User.phone_number.
        msisdn: Optional[str] = None
        if self._db is not None:
            # lazy import to avoid circular
            from sqlalchemy import select
            from app.db.auth.models import User
            user = (await self._db.execute(
                select(User).where(User.id == user_id)
            )).scalars().first()
            msisdn = getattr(user, "phone_number", None)
        if not msisdn:
            # Alternatively, require client to submit phone number via your request DTO and pass it via self._db or a side-channel.
            raise ValueError("User phone number required for M-Pesa STK")

        time_stamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        pwd = stk_password(self.shortcode, self.passkey, time_stamp)

        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": pwd,
            "Timestamp": time_stamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount_kes,
            "PartyA": msisdn,
            "PartyB": self.shortcode,
            "PhoneNumber": msisdn,
            "CallBackURL": self.callback_stk,
            "AccountReference": f"user-{user_id}",
            "TransactionDesc": "Wallet deposit",
        }

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{self.base}/mpesa/stkpush/v1/processrequest", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            # expect CheckoutRequestID and MerchantRequestID
            return {
                "provider_ref": data.get("CheckoutRequestID"),  # use this as your Transaction.provider_ref
                "status": "PENDING",
            }

    async def capture_deposit(self, provider_ref: str) -> Dict[str, Any]:
        """
        STKQuery lets you poll the result if needed (webhook is source of truth).
        """
        # Get access token
        access_token = await get_mpesa_access_token()
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        pwd = stk_password(self.shortcode, self.passkey, timestamp)
        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": pwd,
            "Timestamp": timestamp,
            "CheckoutRequestID": provider_ref,
        }
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{self.base}/mpesa/stkpushquery/v1/query", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            # interpret ResponseCode/ResultCode as needed
            return {"provider_ref": provider_ref, "raw": data}

    async def payout(
        self,
        *,
        user_id: int,
        amount_cents: int,
        destination: str,  # MSISDN in E.164, e.g., 2547XXXXXXXX
        idempotency_key: str | None
    ) -> Dict[str, Any]:
        access_token = await get_mpesa_access_token()
        amount_kes = amount_cents // 100
        payload = {
            "InitiatorName": self.initiator_name,  # per your Daraja setup
            "SecurityCredential": self.security_credential,  # from Daraja cert process
            "CommandID": self.command_id,  # or SalaryPayment/PromotionPayment as applicable
            "Amount": amount_kes,
            "PartyA": self.b2c_shortcode,
            "PartyB": destination,  # MSISDN
            "Remarks": "Wallet withdrawal",
            "QueueTimeOutURL": self.callback_b2c,
            "ResultURL": self.callback_b2c,
            "Occasion": "FantasyFusion",
        }
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{self.base}/mpesa/b2c/v1/paymentrequest", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            # Use ConversationID as provider_ref for your withdrawal tx
            return {"provider_ref": data.get("ConversationID"), "status": "PROCESSING"}
