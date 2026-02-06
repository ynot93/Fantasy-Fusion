# app/db/payments/providers/pesapal_provider.py
from __future__ import annotations
from typing import Optional, Dict, Any
import os, httpx, time
from app.core.config import settings
from app.core.security import get_pesapal_token


class PesapalProvider:
    """
    Card/Wallet deposits via Pesapal Hosted Checkout.
    - create_deposit: register order, return approval (redirect) URL
    - capture_deposit: query payment status by provider_ref (order_tracking_id)
    - payout: Not supported here (Pesapal Payouts are a separate product; implement later or raise)
    """
    def __init__(self):
        self.base = settings.PESAPAL_BASE_URL
        self.callback = settings.PESAPAL_CALLBACK_URL
        self.default_currency = settings.PESAPAL_CURRENCY
        self.ref_prefix = settings.PESAPAL_ACCOUNT_REFERENCE_PREFIX

    async def create_deposit(
        self,
        *,
        user_id: int,
        amount_cents: int,
        currency: str,
        idempotency_key: str | None
    ) -> Dict[str, Any]:
        amount_major = amount_cents / 100.0
        pesapal_token = await get_pesapal_token()
        headers = {
            "Authorization": f"Bearer {pesapal_token}",
            "Content-Type": "application/json"
        }

        payload = {
            "id": idempotency_key or f"dep-{user_id}-{int(time.time())}",
            "currency": currency or self.default_currency,
            "amount": amount_major,
            "description": "Wallet deposit",
            "callback_url": self.callback,     # IPN/Callback endpoint
            "billing_address": {               # optional; fill what you have
                "first_name": "User",
                "last_name": str(user_id),
                "email_address": "user@example.com",
                "phone_number": "",
                "country_code": "KE",
            }
        }

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.base}/api/Transactions/SubmitOrderRequest", headers=headers, json=payload
            )
            resp.raise_for_status()
            data = resp.json()
            # Expect: redirect_url, order_tracking_id
            return {
                "provider_ref": data["order_tracking_id"],
                "approval_url": data["redirect_url"],  # front-end should open this
                "status": "PENDING",
            }

    async def capture_deposit(self, provider_ref: str) -> Dict[str, Any]:
        pesapal_token = await get_pesapal_token()
        headers = {"Authorization": f"Bearer {pesapal_token}"}
        params = {"orderTrackingId": provider_ref}
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self.base}/api/Transactions/GetTransactionStatus",
                headers=headers, params=params
            )
            resp.raise_for_status()
            data = resp.json()
            # data.status can be COMPLETED, FAILED, PENDING, etc.
            return {"provider_ref": provider_ref, "raw": data, "status": data.get("status")}

    async def payout(self, *, user_id: int, amount_cents: int, destination: str, idempotency_key: str | None) -> Dict[str, Any]:
        raise NotImplementedError("Pesapal payouts not implemented in this provider")
