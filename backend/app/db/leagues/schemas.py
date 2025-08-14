from pydantic import BaseModel, ConfigDict
from typing import List
from app.db.auth.schemas import UserResponse

class LeagueBase(BaseModel):
    name: str

class LeagueCreate(LeagueBase):
    pass

class LeagueJoin(BaseModel):
    code: str

class LeagueResponse(LeagueBase):
    id: int
    code: str
    created_by_id: int
    members: List[UserResponse] = []
    model_config = ConfigDict(from_attributes=True)
