from app.db.database import AsyncSessionLocal
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError
from app.db.auth import crud, models
from app.core.security import decode_token

# Dependency to get a database session
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

# Dependency to get the current user
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/fpl-login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user = await db.get(models.User, user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired or invalid")

async def get_current_active_fpl_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Ensures the user is logged in AND has linked their FPL account."""
    if not current_user.fpl_session_cookie or not current_user.fpl_manager_id:
        # 403 Forbidden is often better than 401 Unauthorized here
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="FPL account not linked. Please log in with FPL credentials."
        )
    return current_user
