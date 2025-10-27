from sqlalchemy import Column, Integer, String, ForeignKey, Table, Enum, Boolean, JSON
from app.db.admin.enums import LeagueStatus
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.db.database import Base

# Association table for many-to-many relationship between User and League
league_members = Table(
    "league_members",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("league_id", Integer, ForeignKey("leagues.id", ondelete="CASCADE"), primary_key=True)
)

class League(Base):
    __tablename__ = "leagues"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)

    status: Mapped[LeagueStatus] = mapped_column(Enum(LeagueStatus), default=LeagueStatus.open, nullable=False)
    entry_fee_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    prize_scheme: Mapped[dict] = mapped_column(JSON, default={"first":60,"second":30,"third":10})  # %
    official: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    created_by = relationship("User", back_populates="leagues_created")
    members = relationship("User", secondary=league_members, lazy="selectin", back_populates="leagues_joined")
