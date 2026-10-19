from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict, Field


class UserCreate(BaseModel):
    """Schema for signup."""
    email: EmailStr
    # bcrypt only looks at the first 72 bytes, so reject longer rather than silently truncate
    password: str = Field(min_length=8, max_length=72)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    password: str = Field(min_length=8, max_length=72)


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """A subset of User fields to be returned to the client."""
    id: int
    email: str
    username: str
    fpl_manager_id: Optional[int] = None
    fpl_verified: bool = False
    role: str
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """Schema for the JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = Field(default="bearer")
    user: UserResponse


class FplLinkRequest(BaseModel):
    """A bare FPL manager ID or a pasted Points-page URL (…/entry/<id>/event/<gw>)."""
    team: str = Field(min_length=1, max_length=300)


class FplTeamPreview(BaseModel):
    manager_id: int
    team_name: Optional[str] = None
    manager_name: Optional[str] = None
    overall_points: Optional[int] = None


class FplLinkResponse(BaseModel):
    user: UserResponse
    team: FplTeamPreview


class FplVerificationStatus(BaseModel):
    linked: bool
    verified: bool
    # Join code of the FPL classic league users join to prove ownership; null if not configured
    league_code: Optional[str] = None
