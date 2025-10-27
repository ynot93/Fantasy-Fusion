# app/db/admin/schemas.py
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional, List, Dict, Annotated
from app.db.admin.enums import Role, UserStatus, LeagueStatus

class AdminUserBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: EmailStr
    role: Role
    status: UserStatus
    is_locked: bool

class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    status: Optional[UserStatus] = None
    is_locked: Optional[bool] = None

class AdminChangeRole(BaseModel):
    role: Role

class AdminAdjustBalance(BaseModel):
    delta_cents: Annotated[int, Field(strict=True, ge=-1_000_000, le=1_000_000)]
    reason: str

class AdminUserDetail(AdminUserBase):
    kyc_level: int | None = None
    last_login_at: Optional[str] = None

# Leagues
class AdminLeagueBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    status: LeagueStatus
    entry_fee_cents: int
    prize_scheme: Dict[str,int]
    official: bool

class AdminLeagueCreate(BaseModel):
    name: str
    entry_fee_cents: int = 0
    prize_scheme: Dict[str,int] = {"first":70,"second":20,"third":10}
    official: bool = False

class AdminLeagueUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[LeagueStatus] = None
    entry_fee_cents: Optional[int] = None
    prize_scheme: Optional[Dict[str,int]] = None
    official: Optional[bool] = None

class AdminPayoutRequest(BaseModel):
    league_id: int

# Content
class ContentIn(BaseModel):
    title: str
    slug: str
    body: str

class ContentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    slug: str
    body: str

# Settings
class SettingKV(BaseModel):
    key: str
    value: dict
