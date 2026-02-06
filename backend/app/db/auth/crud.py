from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.auth import schemas
from app.core import security
from app.db.auth import models


async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(models.User).where(models.User.email == email))
    return result.scalars().first()


# async def create_user(db: AsyncSession, user: schemas.UserCreate) -> models.User:
#     hashed_password = security.get_password_hash(user.password)
#     db_user = models.User(username=user.username, email=user.email, hashed_password=hashed_password)
#     db.add(db_user)
#     await db.commit()
#     await db.refresh(db_user)
#     return db_user
