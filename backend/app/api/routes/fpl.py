from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps_fpl import get_fpl_adapter
from app.api.deps import get_db, get_current_user, get_current_linked_fpl_user
from app.services.fpl_adapter import FPLAdapter, FPLEntryNotFound, parse_manager_id
from app.core.config import settings
from app.core.rate_limit import fpl_verify_rate_limiter
from app.db.auth import models, schemas, crud
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# --- PUBLIC / CACHED ENDPOINTS ---

@router.get("/bootstrap", summary="Get all static data (players, teams, elements)")
async def get_bootstrap_data(adapter: FPLAdapter = Depends(get_fpl_adapter)):
    """
    Fetches global, cached FPL data. No authentication required.
    """
    try:
        data = await adapter.bootstrap_static()
        return data
    except Exception as e:
        logger.error(f"Failed to fetch bootstrap data: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="FPL service currently unavailable.")

@router.get("/entry/{entry_id}", summary="Get public profile summary for any FPL manager.")
async def get_public_entry_details(
    entry_id: int,
    adapter: FPLAdapter = Depends(get_fpl_adapter)
):
    """
    Returns the public data for a given FPL Manager ID (entry_id).
    """
    try:
        data = await adapter.get_entry(entry_id)
        return data
    except Exception as e:
        logger.error(f"Entry data fetch failed for ID {entry_id}: {e}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="FPL Manager not found.")

# --- LINKING + OWNERSHIP VERIFICATION ---

def _team_preview(manager_id: int, entry: dict) -> schemas.FplTeamPreview:
    manager_name = f"{entry.get('player_first_name', '')} {entry.get('player_last_name', '')}".strip()
    return schemas.FplTeamPreview(
        manager_id=manager_id,
        team_name=entry.get("name"),
        manager_name=manager_name or None,
        overall_points=entry.get("summary_overall_points"),
    )


@router.post("/link", response_model=schemas.FplLinkResponse, summary="Link (or re-link) the current user's FPL team.")
async def link_fpl_team(
    body: schemas.FplLinkRequest,
    db: AsyncSession = Depends(get_db),
    adapter: FPLAdapter = Depends(get_fpl_adapter),
    user: models.User = Depends(get_current_user),
):
    manager_id = parse_manager_id(body.team)
    if manager_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Enter your FPL manager ID or paste the URL of your FPL Points page.",
        )

    try:
        entry = await adapter.get_entry(manager_id)
    except FPLEntryNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No FPL team found with that ID.")
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="FPL service currently unavailable.")

    owner = await crud.get_user_by_fpl_manager_id(db, manager_id)
    if owner and owner.id != user.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That FPL team is already linked to another account.")

    if user.fpl_manager_id != manager_id:
        # A different team needs its own ownership check
        user.fpl_manager_id = manager_id
        user.fpl_verified = False
        user.fpl_verified_at = None
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="That FPL team is already linked to another account.")
        await db.refresh(user)

    return schemas.FplLinkResponse(user=user, team=_team_preview(manager_id, entry))


@router.get("/verification", response_model=schemas.FplVerificationStatus)
async def get_verification_status(user: models.User = Depends(get_current_user)):
    return schemas.FplVerificationStatus(
        linked=user.fpl_manager_id is not None,
        verified=user.fpl_verified,
        league_code=settings.FPL_VERIFICATION_LEAGUE_CODE,
    )


@router.post("/verify", response_model=schemas.UserResponse, summary="Check the linked team has joined the verification league.")
async def verify_fpl_team(
    db: AsyncSession = Depends(get_db),
    adapter: FPLAdapter = Depends(get_fpl_adapter),
    user: models.User = Depends(get_current_linked_fpl_user),
):
    if user.fpl_verified:
        return user
    if settings.FPL_VERIFICATION_LEAGUE_ID is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Team verification is not available right now.")

    fpl_verify_rate_limiter.check(f"user:{user.id}")

    try:
        # Bypass our cache: the user has usually just joined the league on FPL
        entry = await adapter.get_entry(user.fpl_manager_id, use_cache=False)
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="FPL service currently unavailable.")

    league_ids = {l.get("id") for l in entry.get("leagues", {}).get("classic", [])}
    if settings.FPL_VERIFICATION_LEAGUE_ID not in league_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="We couldn't find your team in the verification league yet. Join it on FPL, then try again.",
        )

    user.fpl_verified = True
    user.fpl_verified_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user

# --- PROTECTED USER ENDPOINTS ---

@router.get("/my-picks/{event_id}", summary="Get the user's weekly picks (squad + captain).")
async def get_current_users_picks(
    event_id: int,
    adapter: FPLAdapter = Depends(get_fpl_adapter),
    user: models.User = Depends(get_current_linked_fpl_user)
):
    """
    Fetches the team selection for a specific Gameweek (event_id).
    """
    try:
        data = await adapter.get_entry_picks(user.fpl_manager_id, event_id)
        return data
    except FPLEntryNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No picks found for that gameweek.")
    except Exception as e:
        logger.error(f"Picks fetch failed for user {user.id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error fetching picks data.")
