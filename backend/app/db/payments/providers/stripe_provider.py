# app/db/payments/providers/stripe_provider.py
from __future__ import annotations
from typing import Optional, Dict, Any
import stripe
from app.core.config import settings

class StripeProvider:
    """
    Implements:
      async def create_deposit(...)
      async def capture_deposit(...)
      async def payout(...)
    """
    def __init__(self):
        stripe.api_key = settings.STRIPE_SECRET_KEY
        self.connect_mode = settings.STRIPE_CONNECT == "true"

    async def create_deposit(
        self,
        *,
        user_id: int,
        amount_cents: int,
        currency: str = "usd",
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a PaymentIntent and return provider_ref (pi.id) + client_secret.
        Client will confirm the intent with card details (e.g., stripe.js).
        """
        # Put helpful metadata on the intent so the webhook can correlate to your Transaction row
        metadata = {
            "app_user_id": str(user_id),
            "app_kind": "wallet_deposit",
        }

        # Stripe recommends idempotency keys for POSTs
        # Use the header `Idempotency-Key` to guard against double-charges
        pi = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=currency,
            metadata=metadata,
            # If you prefer automatic confirmation on server (requires payment method id on server):
            # confirm=True, payment_method=..., return_url=...
            idempotency_key=idempotency_key
        )

        return {
            "provider_ref": pi["id"],              # e.g. "pi_123"
            "client_secret": pi["client_secret"],  # used by client to confirm
            "status": pi["status"],
        }

    async def capture_deposit(self, provider_ref: str) -> Dict[str, Any]:
        """
        For flows where you created a PaymentIntent with capture_method='manual'
        and want to capture later (e.g., hold funds).
        """
        pi = stripe.PaymentIntent.capture(provider_ref)
        return {
            "provider_ref": pi["id"],
            "status": pi["status"],  # should be 'succeeded' after capture
        }

    async def payout(
        self,
        *,
        user_id: int,
        amount_cents: int,
        destination: str,   # for Stripe Connect this is the connected account id (acct_...)
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        "Withdrawals" require Stripe Connect if you’re sending funds to your users.
        Typical flow:
          - Your platform takes funds from its platform balance (top-ups or charges)
          - Create a Transfer to the connected account
          - The connected account schedules a Payout to their bank/mobile wallet
        Alternatively, use 'Payouts' directly from a connected account context.
        """
        if not self.connect_mode:
            # If you don't use Connect, you can't "payout to a user".
            # You can only REFUND the original PaymentIntent (back to card).
            raise NotImplementedError("Payouts require Stripe Connect. Enable STRIPE_CONNECT.")

        # Example: make a transfer to a connected account
        # (Your platform must have balance in same currency.)
        transfer = stripe.Transfer.create(
            amount=amount_cents,
            currency="kes",
            destination=destination,   # acct_...
            metadata={"app_user_id": str(user_id), "app_kind": "wallet_withdrawal"},
            idempotency_key=idempotency_key,
        )

        return {
            "provider_ref": transfer["id"],   # tr_...
            "status": "TRANSFER_CREATED",
        }
