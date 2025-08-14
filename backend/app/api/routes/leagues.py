from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.db.leagues import schemas, crud
from app.api.deps import get_db
from app.api.deps import get_current_user  # assumes JWT auth

router = APIRouter()

@router.post("/", response_model=schemas.LeagueResponse, status_code=status.HTTP_201_CREATED)
async def create_league(
    league_in: schemas.LeagueCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return await crud.create_league(db, league_in, creator_id=current_user.id)

@router.post("/join", response_model=schemas.LeagueResponse)
async def join_league(
    league_in: schemas.LeagueJoin,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    league = await crud.join_league(db, current_user.id, league_in.code)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    return league

@router.get("/{league_id}", response_model=schemas.LeagueResponse)
async def get_league(
    league_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    league = await crud.get_league(db, league_id)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    return league
