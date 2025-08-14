import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.leagues import models, schemas
from app.db.auth import models as auth_models

async def create_league(db: AsyncSession, league_in: schemas.LeagueCreate, creator_id: int):
    invite_code = secrets.token_hex(4)  # 8-char hex code
    league = models.League(
        name=league_in.name,
        code=invite_code,
        created_by_id=creator_id
    )

    # Add creator as first member
    league.members.append(await db.get(auth_models.User, creator_id))
    db.add(league)
    await db.commit()
    await db.refresh(league)
    return league

async def get_league_by_code(db: AsyncSession, code: str):
    result = await db.execute(select(models.League).where(models.League.code == code))
    return result.scalars().first()

async def join_league(db: AsyncSession, user_id: int, code: str):
    league = await get_league_by_code(db, code)
    if not league:
        return None
    user = await db.get(auth_models.User, user_id)
    if user not in league.members:
        league.members.append(user)
        await db.commit()
        await db.refresh(league)
    return league

async def get_league(db: AsyncSession, league_id: int):
    return await db.get(models.League, league_id)
