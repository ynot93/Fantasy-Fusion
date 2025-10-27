# app/api/routes/admin/leagues.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_db, get_current_user
from app.core.rbac import require_role
from app.db.admin.enums import Role, LeagueStatus
from app.db.leagues.models import League
from app.db.admin.schemas import AdminLeagueBase, AdminLeagueCreate, AdminLeagueUpdate, AdminPayoutRequest
from app.db.auth.schemas import UserResponse
from app.db.payments.service import PaymentsService

router = APIRouter(prefix="/admin/leagues", tags=["admin:leagues"])

@router.get("", response_model=list[AdminLeagueBase])
async def list_leagues(
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_role(Role.admin, Role.super_admin))
):
    rows = (await db.execute(select(League))).scalars().all()
    return rows

@router.post("", response_model=AdminLeagueBase)
async def create_league_admin(
    payload: AdminLeagueCreate,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_role(Role.admin, Role.super_admin))
):
    created_league = League(
        name=payload.name,
        code="admin_" + payload.name.lower().replace(" ", "_"),
        created_by_id=1,  # or use current admin id
        entry_fee_cents=payload.entry_fee_cents,
        prize_scheme=payload.prize_scheme,
        official=payload.official,
        status=LeagueStatus.open,
    )
    db.add(created_league); await db.commit(); await db.refresh(created_league)
    return created_league

@router.get("/{league_id}", response_model=AdminLeagueBase)
async def get_league(league_id: int, db: AsyncSession = Depends(get_db), _ = Depends(require_role(Role.admin, Role.super_admin))):
    league = await db.get(League, league_id)
    if not league: raise HTTPException(404, "League not found")
    return league

@router.patch("/{league_id}", response_model=AdminLeagueBase)
async def update_league(league_id: int, payload: AdminLeagueUpdate, db: AsyncSession = Depends(get_db), _ = Depends(require_role(Role.admin, Role.super_admin))):
    updated_league = await db.get(League, league_id)
    if not updated_league: raise HTTPException(404, "League not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(updated_league, k, v)
    await db.commit(); await db.refresh(updated_league)
    return updated_league

@router.post("/{league_id}/recalculate")
async def recalc(league_id: int, db: AsyncSession = Depends(get_db), _ = Depends(require_role(Role.admin, Role.super_admin))):
    # trigger background job to recompute ranks/points (stub)
    return {"ok": True}

@router.post("/{league_id}/payouts")
async def trigger_payouts(league_id: int, _: AdminPayoutRequest, db: AsyncSession = Depends(get_db), user: UserResponse = Depends(get_current_user) ,_r = Depends(require_role(Role.admin, Role.super_admin))):
    result = await PaymentsService.payout_winner(db, league_id, user.id)
    return result

@router.post("/{league_id}/close")
async def close_league(league_id: int, db: AsyncSession = Depends(get_db), _ = Depends(require_role(Role.admin, Role.super_admin))):
    l = await db.get(League, league_id)
    if not l: raise HTTPException(404, "League not found")
    l.status = LeagueStatus.completed
    await db.commit()
    return {"ok": True}
