from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, BigInteger, Enum, ForeignKey, DateTime, func, UniqueConstraint, text
from app.db.database import Base
import enum

class TxType(str, enum.Enum):
    DEPOSIT = "DEPOSIT"
    WITHDRAW = "WITHDRAW"
    LEAGUE_CONTRIBUTION = "LEAGUE_CONTRIBUTION"
    PAYOUT = "PAYOUT"
    HOUSE_FEE = "HOUSE_FEE"
    ADJUSTMENT = "ADJUSTMENT"

class TxStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"

class Provider(str, enum.Enum):
    MPESA = "MPESA"
    PAYPAL = "PAYPAL"
    STRIPE = "STRIPE"
    PESAPAL = "PESAPAL"

class Wallet(Base):
    __tablename__ = "wallets"
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    # store in **minor units** (cents)
    balance_cents: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    user = relationship("User", back_populates="wallet")

class Transaction(Base):
    __tablename__ = "transactions"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    league_id: Mapped[int | None] = mapped_column(ForeignKey("leagues.id"), nullable=True)
    type: Mapped[TxType] = mapped_column(Enum(TxType), nullable=False)
    provider: Mapped[Provider | None] = mapped_column(Enum(Provider), nullable=True)
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="KES", nullable=False)
    status: Mapped[TxStatus] = mapped_column(Enum(TxStatus), default=TxStatus.PENDING, nullable=False)
    # External identifiers & idempotency
    provider_ref: Mapped[str | None] = mapped_column(String(100), index=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(64), index=True)
    error: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("provider", "provider_ref", name="uq_provider_ref"),
        UniqueConstraint("idempotency_key", name="uq_idempotency"),
    )

class LeaguePot(Base):
    __tablename__ = "league_pots"
    league_id: Mapped[int] = mapped_column(ForeignKey("leagues.id"), primary_key=True)
    pot_cents: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    house_cents: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
