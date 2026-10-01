from pydantic import BaseModel, Field, ConfigDict, conint
from typing import Literal, Optional, Annotated
from datetime import datetime

class WalletResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: int
    balance_cents: int

class DepositRequest(BaseModel):
    amount_cents: Annotated[int, Field(gt=0)]
    currency: str
    provider: Literal["MPESA", "STRIPE"]
    idempotency_key: Optional[str] = Field(default=None, max_length=64)

class WithdrawRequest(BaseModel):
    amount_cents: Annotated[int, Field(gt=0)]
    destination: str  # mpesa phone | last4/pm_xxx, depending on provider
    provider: Literal["MPESA", "STRIPE"]
    idempotency_key: Optional[str] = Field(default=None, max_length=64)

class DepositInitResponse(BaseModel):
    transaction_id: int
    status: str  # "PENDING"
    provider_client_secret: str | None = None 

class JoinLeagueRequest(BaseModel):
    code: str

class LeagueContributionRequest(BaseModel):
    league_id: int
    amount_cents: Annotated[int, Field(gt=0)]

class PayoutRequest(BaseModel):
    league_id: int
    winner_user_id: int

class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    league_id: Optional[int] = None
    type: str
    provider: Optional[str] = None
    amount_cents: int
    currency: str
    status: str
    created_at: datetime
