from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from app.db.auth.schemas import UserResponse

class LeagueBase(BaseModel):
    name: str

class LeagueCreate(LeagueBase):
    is_private: bool = False
    max_members: Optional[int] = None
    entry_fee_cents: int = 0

class LeagueJoin(BaseModel):
    code: str

class LeagueMemberResponse(UserResponse):
    name: Optional[str] = None
    team_name: Optional[str] = None
    points: Optional[int] = None

class LeagueResponse(LeagueBase):
    id: int
    code: str
    created_by_id: int
    is_private: bool
    max_members: Optional[int] = None
    entry_fee_cents: int
    prize_pool_cents: int = 0
    members: List[LeagueMemberResponse] = []
    model_config = ConfigDict(from_attributes=True)
