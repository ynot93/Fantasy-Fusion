import secrets
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.auth import schemas
from app.core import security
from app.db.auth import models


async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(models.User).where(models.User.email == email.lower()))
    return result.scalars().first()


async def get_user_by_fpl_manager_id(db: AsyncSession, manager_id: int):
    result = await db.execute(select(models.User).where(models.User.fpl_manager_id == manager_id))
    return result.scalars().first()


async def create_user(db: AsyncSession, user: schemas.UserCreate) -> models.User:
    email = user.email.lower()
    # username is unique but not user-facing yet; derive one so signup stays email + password
    local_part = email.split("@", 1)[0][:60]
    db_user = models.User(
        email=email,
        username=f"{local_part}_{secrets.token_hex(3)}",
        hashed_password=security.get_password_hash(user.password),
        role=models.Role.user,
        status=models.UserStatus.active,
        is_locked=False,
        kyc_level=0,
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user
