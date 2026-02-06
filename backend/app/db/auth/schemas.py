from pydantic import BaseModel, EmailStr, ConfigDict, Field


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """A subset of User fields to be returned to the client."""
    id: int
    email: str
    fpl_manager_id: int
    role: str
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """Schema for the JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = Field(default="bearer")
    user: UserResponse
