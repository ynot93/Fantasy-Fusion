from fastapi import APIRouter, Depends, HTTPException, status
from app.db.auth import schemas, models
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core import security
from app.api.deps import get_db
from app.db.auth import crud
from app.api.deps_fpl import get_fpl_adapter
from app.services.fpl_adapter import FPLAdapter

router = APIRouter()

# @router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
# async def register(user: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
#     existing_user = await crud.get_user_by_email(db, user.email)
#     if existing_user:
#         raise HTTPException(status_code=400, detail="Email already registered")
#     if len(user.password) < 8:
#         raise HTTPException(status_code=400, detail="Password too short")
#     new_user = await crud.create_user(db, user)
#     return new_user


# @router.post("/login")
# async def login(user: schemas.UserLogin, db: AsyncSession = Depends(get_db)):
#     db_user = await crud.get_user_by_email(db, user.email)
#     if not db_user or not security.verify_password(user.password, db_user.hashed_password):
#         raise HTTPException(status_code=401, detail="Invalid credentials")
    
#     access_token = security.create_access_token(
#         data={"sub": str(db_user.id), "role": db_user.role}
#     )

#     refresh_token = security.create_refresh_token(
#         data={"sub": str(db_user.id), "role": db_user.role}
#     )

#     return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/fpl-login", response_model=schemas.Token) # Define Token schema as needed
async def login_with_fpl(
    credentials: schemas.UserLogin, # email, password
    db: AsyncSession = Depends(get_db),
    adapter: FPLAdapter = Depends(get_fpl_adapter)
):
    # 1. Verify Credentials with FPL (The "Authentication" Step)
    try:
        # This function returns { "manager_id": 123, "cookie": "..." }
        fpl_data = await adapter.login_and_get_details(credentials.email, credentials.password)
    except Exception as e:
        # If FPL rejects the password, we reject the login
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid FPL credentials"
        )

    fpl_id = fpl_data["manager_id"]
    cookie = fpl_data["cookie"]

    # 2. Check if user exists in YOUR database (The "Identification" Step)
    # We query by fpl_manager_id, NOT email
    query = select(models.User).where(models.User.fpl_manager_id == fpl_id)
    result = await db.execute(query)
    db_user = result.scalars().first()

    if not db_user:
        # === SCENARIO A: NEW USER (Auto-Register) ===
        db_user = models.User(
            email=credentials.email, # Use the email they logged in with
            fpl_manager_id=fpl_id,
            fpl_session_cookie=cookie,
            role=models.Role.user,
            status=models.UserStatus.active,
            username=f"fpl_user_{fpl_id}", 
            is_locked=False,
            kyc_level=0,
            # Wallet/Leagues are empty/default
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        
    else:
        # === SCENARIO B: EXISTING USER (Update Cookie) ===
        # Always update the cookie to the freshest one
        db_user.fpl_session_cookie = cookie
        
        # Optional: Update email if they changed it on FPL side? 
        # Usually better to keep the input email or ask FPL /api/me/ for the profile email
        
        await db.commit()
        await db.refresh(db_user)

    # 3. Issue YOUR JWT (Session Management)
    # The frontend will use this token for future requests, not the FPL password
    access_token = security.create_access_token(
        data={"sub": str(db_user.id), "role": db_user.role}
    )
    
    refresh_token = security.create_refresh_token(
        data={"sub": str(db_user.id), "role": db_user.role}
    )

    return {
        "access_token": access_token, 
        "refresh_token": refresh_token, 
        "token_type": "bearer",
        "user": db_user # Optional: return user data
    }