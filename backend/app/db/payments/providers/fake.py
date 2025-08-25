# app/payments/providers/fake.py
import uuid
class FakeProvider:
    def __init__(self, name: str): self.name = name
    async def create_deposit(self, *, user_id:int, amount_cents:int, currency:str, idempotency_key:str|None)->dict:
        return {"provider_ref": f"{self.name}-{uuid.uuid4()}", "client_secret": None}
    async def capture_deposit(self, provider_ref:str)->dict:
        return {"status": "succeeded"}
    async def payout(self, *, user_id:int, amount_cents:int, destination:str, idempotency_key:str|None)->dict:
        return {"provider_ref": f"{self.name}-payout-{uuid.uuid4()}"}
