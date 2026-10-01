# app/api/routes/admin/leagues.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_db
from app.core.rbac import require_role
from app.db.admin.enums import Role, LeagueStatus
from app.db.leagues.models import League
from app.db.leagues.crud import get_prize_pool_cents, get_prize_pools_cents
from app.db.auth.models import User
from app.db.admin.schemas import AdminLeagueBase, AdminLeagueDetail, AdminLeagueCreator, AdminLeagueCreate, AdminLeagueUpdate, AdminPayoutRequest
from app.db.payments.service import PaymentsService
from app.api.routes.payments import get_payments_service
from app.api.routes.leagues import _enrich_members
from app.api.deps_fpl import get_fpl_adapter
from app.services.fpl_adapter import FPLAdapter
from app.db.leagues.schemas import LeagueMemberResponse

router = APIRouter(prefix="/admin/leagues", tags=["admin:leagues"])


def _to_admin_response(league: League, prize_pool_cents: int, creator: User | None) -> AdminLeagueBase:
    return AdminLeagueBase.model_validate(league).model_copy(update={
        "prize_pool_cents": prize_pool_cents,
        "participant_count": len(league.members),
        "creator": AdminLeagueCreator.model_validate(creator) if creator else None,
    })


@router.get("", response_model=list[AdminLeagueBase])
async def list_leagues(
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_role(Role.admin, Role.super_admin))
):
    leagues = (await db.execute(select(League))).scalars().all()
    pools = await get_prize_pools_cents(db, [l.id for l in leagues])
    creator_ids = {l.created_by_id for l in leagues}
    creators = {u.id: u for u in (await db.execute(select(User).where(User.id.in_(creator_ids)))).scalars().all()}
    return [_to_admin_response(l, pools.get(l.id, 0), creators.get(l.created_by_id)) for l in leagues]

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
    creator = await db.get(User, created_league.created_by_id)
    return _to_admin_response(created_league, 0, creator)

@router.get("/{league_id}", response_model=AdminLeagueDetail)
async def get_league(
    league_id: int,
    db: AsyncSession = Depends(get_db),
    _ = Depends(require_role(Role.admin, Role.super_admin)),
    adapter: FPLAdapter = Depends(get_fpl_adapter),
):
    league = await db.get(League, league_id)
    if not league: raise HTTPException(404, "League not found")
    prize_pool_cents = await get_prize_pool_cents(db, league.id)
    creator = await db.get(User, league.created_by_id)
    base = _to_admin_response(league, prize_pool_cents, creator)
    member_base = [LeagueMemberResponse.model_validate(m) for m in league.members]
    detail = AdminLeagueDetail.model_validate(base).model_copy(update={
        "members": await _enrich_members(adapter, member_base)
    })
    return detail

@router.patch("/{league_id}", response_model=AdminLeagueBase)
async def update_league(league_id: int, payload: AdminLeagueUpdate, db: AsyncSession = Depends(get_db), _ = Depends(require_role(Role.admin, Role.super_admin))):
    updated_league = await db.get(League, league_id)
    if not updated_league: raise HTTPException(404, "League not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(updated_league, k, v)
    await db.commit(); await db.refresh(updated_league)
    prize_pool_cents = await get_prize_pool_cents(db, updated_league.id)
    creator = await db.get(User, updated_league.created_by_id)
    return _to_admin_response(updated_league, prize_pool_cents, creator)

@router.post("/{league_id}/recalculate")
async def recalc(league_id: int, db: AsyncSession = Depends(get_db), _ = Depends(require_role(Role.admin, Role.super_admin))):
    # trigger background job to recompute ranks/points (stub)
    return {"ok": True}

@router.post("/{league_id}/payouts")
async def trigger_payouts(
    league_id: int,
    payload: AdminPayoutRequest,
    db: AsyncSession = Depends(get_db),
    svc: PaymentsService = Depends(get_payments_service),
    _r = Depends(require_role(Role.admin, Role.super_admin)),
):
    try:
        tx = await svc.payout_winner(db, league_id=league_id, winner_user_id=payload.winner_user_id)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    return {"transaction_id": tx.id, "status": tx.status.value, "amount_cents": tx.amount_cents}

@router.post("/{league_id}/close")
async def close_league(league_id: int, db: AsyncSession = Depends(get_db), _ = Depends(require_role(Role.admin, Role.super_admin))):
    l = await db.get(League, league_id)
    if not l: raise HTTPException(404, "League not found")
    l.status = LeagueStatus.completed
    await db.commit()
    return {"ok": True}
