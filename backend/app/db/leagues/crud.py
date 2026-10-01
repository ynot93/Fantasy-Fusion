import secrets
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.leagues import models, schemas
from app.db.auth import models as auth_models
from app.db.payments.models import LeaguePot

async def create_league(db: AsyncSession, league_in: schemas.LeagueCreate, creator_id: int):
    invite_code = secrets.token_hex(4)  # 8-char hex code
    league = models.League(
        name=league_in.name,
        code=invite_code,
        created_by_id=creator_id,
        is_private=league_in.is_private,
        max_members=league_in.max_members,
        entry_fee_cents=league_in.entry_fee_cents,
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

async def join_league(db: AsyncSession, user_id: int, code: str) -> tuple[models.League | None, str | None]:
    league = await get_league_by_code(db, code)
    if not league:
        return None, "not_found"
    user = await db.get(auth_models.User, user_id)
    if user not in league.members:
        if league.max_members is not None and len(league.members) >= league.max_members:
            return None, "full"
        league.members.append(user)
        await db.commit()
        await db.refresh(league)
    return league, None

async def get_league(db: AsyncSession, league_id: int):
    return await db.get(models.League, league_id)

async def list_leagues(db: AsyncSession, *, is_private: bool | None = None, limit: int = 50, offset: int = 0):
    query = select(models.League)
    if is_private is not None:
        query = query.where(models.League.is_private == is_private)
    query = query.order_by(models.League.id.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()

async def list_my_leagues(db: AsyncSession, user_id: int):
    query = (
        select(models.League)
        .join(models.league_members, models.league_members.c.league_id == models.League.id)
        .where(models.league_members.c.user_id == user_id)
        .order_by(models.League.id.desc())
    )
    result = await db.execute(query)
    return result.scalars().all()

async def get_prize_pool_cents(db: AsyncSession, league_id: int) -> int:
    pot = await db.get(LeaguePot, league_id)
    return pot.pot_cents if pot else 0

async def get_prize_pools_cents(db: AsyncSession, league_ids: list[int]) -> dict[int, int]:
    if not league_ids:
        return {}
    result = await db.execute(select(LeaguePot).where(LeaguePot.league_id.in_(league_ids)))
    return {pot.league_id: pot.pot_cents for pot in result.scalars().all()}
