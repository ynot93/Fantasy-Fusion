from fastapi import APIRouter, Depends, HTTPException, status
from app.db.auth import schemas
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.api.deps import get_db
from datetime import timedelta
from app.core.config import settings
from app.db.auth import crud

router = APIRouter()

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    existing_user = await crud.get_user_by_email(db, user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    if len(user.password) < 8:
        raise HTTPException(status_code=400, detail="Password too short")
    new_user = await crud.create_user(db, user)
    return new_user


@router.post("/login")
async def login(user: schemas.UserLogin, db: AsyncSession = Depends(get_db)):
    db_user = await crud.get_user_by_email(db, user.email)
    if not db_user or not security.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = security.create_access_token(
        data={"sub": str(db_user.id)}
    )

    refresh_token = security.create_refresh_token(
        data={"sub": str(db_user.id)}
    )

    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}
