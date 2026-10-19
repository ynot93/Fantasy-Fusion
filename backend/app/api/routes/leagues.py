from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from app.db.leagues import schemas, crud
from app.api.deps import get_db
from app.api.deps import get_current_user  # assumes JWT auth
from app.api.deps_fpl import get_fpl_adapter
from app.services.fpl_adapter import FPLAdapter

router = APIRouter()


def _require_fpl_for_league(user, entry_fee_cents: int) -> None:
    """Every league member needs a linked FPL team (it's what the leaderboard
    scores); leagues with an entry fee also need that team's ownership verified."""
    if user.fpl_manager_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Link your FPL team first.")
    if entry_fee_cents > 0 and not user.fpl_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verify your FPL team before joining a league with an entry fee.",
        )


def _to_response(league, prize_pool_cents: int) -> schemas.LeagueResponse:
    return schemas.LeagueResponse.model_validate(league).model_copy(update={"prize_pool_cents": prize_pool_cents})


async def _enrich_members(adapter: FPLAdapter, members: List[schemas.LeagueMemberResponse]) -> List[schemas.LeagueMemberResponse]:
    """Fill in name/team_name/points from each member's public FPL entry.
    get_entry() is cached ~1hr per manager by the adapter, so this stays cheap
    across repeated leaderboard views. Any member whose FPL lookup fails keeps
    the (null) defaults rather than failing the whole league fetch.
    """
    enriched = []
    for m in members:
        if m.fpl_manager_id is None:
            enriched.append(m)
            continue
        try:
            entry = await adapter.get_entry(m.fpl_manager_id)
            name = f"{entry.get('player_first_name', '')} {entry.get('player_last_name', '')}".strip() or None
            enriched.append(m.model_copy(update={
                "name": name,
                "team_name": entry.get("name"),
                "points": entry.get("summary_event_points"),
            }))
        except Exception:
            enriched.append(m)
    return enriched


@router.get("/", response_model=List[schemas.LeagueResponse])
async def list_leagues(
    is_private: Optional[bool] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    leagues = await crud.list_leagues(db, is_private=is_private, limit=limit, offset=offset)
    pools = await crud.get_prize_pools_cents(db, [l.id for l in leagues])
    return [_to_response(l, pools.get(l.id, 0)) for l in leagues]


@router.post("/", response_model=schemas.LeagueResponse, status_code=status.HTTP_201_CREATED)
async def create_league(
    league_in: schemas.LeagueCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # The creator is added as the first member, so the same membership rules apply
    _require_fpl_for_league(current_user, league_in.entry_fee_cents)
    league = await crud.create_league(db, league_in, creator_id=current_user.id)
    return _to_response(league, 0)

@router.get("/mine", response_model=List[schemas.LeagueResponse])
async def list_my_leagues(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    leagues = await crud.list_my_leagues(db, current_user.id)
    pools = await crud.get_prize_pools_cents(db, [l.id for l in leagues])
    return [_to_response(l, pools.get(l.id, 0)) for l in leagues]

@router.post("/join", response_model=schemas.LeagueResponse)
async def join_league(
    league_in: schemas.LeagueJoin,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    existing = await crud.get_league_by_code(db, league_in.code)
    if not existing:
        raise HTTPException(status_code=404, detail="League not found")
    _require_fpl_for_league(current_user, existing.entry_fee_cents)
    league, error = await crud.join_league(db, current_user.id, league_in.code)
    if error == "not_found":
        raise HTTPException(status_code=404, detail="League not found")
    if error == "full":
        raise HTTPException(status_code=400, detail="League is full")
    prize_pool_cents = await crud.get_prize_pool_cents(db, league.id)
    return _to_response(league, prize_pool_cents)

@router.get("/{league_id}", response_model=schemas.LeagueResponse)
async def get_league(
    league_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
    adapter: FPLAdapter = Depends(get_fpl_adapter),
):
    league = await crud.get_league(db, league_id)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    prize_pool_cents = await crud.get_prize_pool_cents(db, league.id)
    response = _to_response(league, prize_pool_cents)
    response.members = await _enrich_members(adapter, response.members)
    return response
