from __future__ import annotations
from sqlalchemy import Integer, String, Boolean, DateTime, Enum, func
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.db.leagues.models import league_members
from app.db.database import Base
from app.db.admin.enums import Role, UserStatus

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone_number: Mapped[str | None] = mapped_column(String(12), unique=True, index=True, nullable=True)
    # hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(Enum(Role), default=Role.user, nullable=False)
    status: Mapped[UserStatus] = mapped_column(Enum(UserStatus), default=UserStatus.active, nullable=False)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    kyc_level: Mapped[int] = mapped_column(Integer, default=0)  # optional
    last_login_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    leagues_created = relationship("League", back_populates="created_by")
    leagues_joined = relationship("League", secondary=league_members, back_populates="members")
    wallet = relationship('Wallet', back_populates="user", uselist=False)

    fpl_manager_id: Mapped[int | None] = mapped_column(Integer, unique=True, index=True, nullable=False)
    fpl_session_cookie: Mapped[str | None] = mapped_column(String, nullable=True)
