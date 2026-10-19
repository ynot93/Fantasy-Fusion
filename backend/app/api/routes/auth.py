from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.auth import schemas, models, crud
from app.core import security
from app.core.config import settings
from app.core.rate_limit import login_rate_limiter, password_reset_rate_limiter
from app.services.email import send_email
from app.api.deps import get_db, get_current_user

router = APIRouter()


def _issue_tokens(user: models.User) -> dict:
    claims = {"sub": str(user.id), "role": user.role}
    return {
        "access_token": security.create_access_token(data=claims),
        "refresh_token": security.create_refresh_token(data=claims),
        "token_type": "bearer",
        "user": user,
    }


@router.post("/signup", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
async def signup(user_in: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    if await crud.get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")
    try:
        user = await crud.create_user(db, user_in)
    except IntegrityError:
        # Lost a race with a concurrent signup for the same email
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")
    return _issue_tokens(user)


@router.post("/login", response_model=schemas.Token)
async def login(
    request: Request,
    credentials: schemas.UserLogin,
    db: AsyncSession = Depends(get_db),
):
    login_rate_limiter.check(request.client.host if request.client else "unknown")

    user = await crud.get_user_by_email(db, credentials.email)
    if not user or not security.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return _issue_tokens(user)


_RESET_REQUESTED = {"detail": "If an account exists for that email, we've sent a link to reset its password."}


@router.post("/password-reset/request", status_code=status.HTTP_202_ACCEPTED)
async def request_password_reset(
    request: Request,
    body: schemas.PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    password_reset_rate_limiter.check(request.client.host if request.client else "unknown")

    user = await crud.get_user_by_email(db, body.email)
    # Same response whether or not the account exists, so this can't be used to
    # discover which emails are registered; sending happens in the background so
    # timing doesn't give it away either.
    if user:
        token = security.create_password_reset_token(user.id, user.hashed_password)
        link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?token={token}"
        background_tasks.add_task(
            send_email,
            user.email,
            "Reset your Fantasy Fusion password",
            "Someone asked to reset the password for your Fantasy Fusion account.\n\n"
            f"Reset it here (the link expires in {settings.PASSWORD_RESET_EXPIRE_MINUTES} minutes):\n{link}\n\n"
            "If this wasn't you, ignore this email - your password won't change.",
        )
    return _RESET_REQUESTED


@router.post("/password-reset/confirm")
async def confirm_password_reset(body: schemas.PasswordResetConfirm, db: AsyncSession = Depends(get_db)):
    invalid = HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="This reset link is invalid or has expired. Request a new one.",
    )
    claims = security.read_password_reset_token(body.token)
    if claims is None:
        raise invalid
    user_id, fingerprint = claims
    user = await db.get(models.User, user_id)
    # Fingerprint mismatch means the password already changed since the link was issued
    if not user or not security.password_fingerprint_matches(user.hashed_password, fingerprint):
        raise invalid

    user.hashed_password = security.get_password_hash(body.password)
    await db.commit()
    return {"detail": "Your password has been reset. You can now log in."}


@router.get("/me", response_model=schemas.UserResponse)
async def me(current_user: models.User = Depends(get_current_user)):
    return current_user
