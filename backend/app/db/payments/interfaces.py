from typing import Protocol, Optional

class PaymentProvider(Protocol):
    async def create_deposit(self, *, user_id: int, amount_cents: int, currency: str, idempotency_key: str | None) -> dict:
        """Return dict with fields like provider_ref, client_secret/approval_url if any."""
    async def capture_deposit(self, provider_ref: str) -> dict:
        """For providers that require explicit capture (Stripe/PayPal)."""
    async def payout(self, *, user_id: int, amount_cents: int, destination: str, idempotency_key: str | None) -> dict:
        """Withdrawals or outbound payouts, return provider_ref."""
