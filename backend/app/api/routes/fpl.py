from fastapi import APIRouter, Depends, HTTPException, Body, Query, status
from app.api.deps_fpl import get_fpl_adapter
from app.api.deps import get_current_active_fpl_user
from app.services.fpl_adapter import FPLAdapter
from app.db.auth import models
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

# --- PROTECTED USER ENDPOINTS ---

@router.get("/my-team", summary="Get the current user's team, transfers, and bank.")
async def get_current_users_team(
    adapter: FPLAdapter = Depends(get_fpl_adapter),
    user: models.User = Depends(get_current_active_fpl_user) 
):
    """
    Fetches protected /my-team/ endpoint data using the stored FPL cookie.
    """
    try:
        data = await adapter.get_my_team(user.fpl_manager_id, user.fpl_session_cookie)
        return data
    except Exception as e:
        logger.error(f"FPL Data fetch failed for user {user.id}: {e}")
        # Detect FPL token expiry (401/403)
        if "401" in str(e) or "403" in str(e):
             raise HTTPException(
                 status_code=status.HTTP_401_UNAUTHORIZED, 
                 detail="FPL Session expired. Please log in with FPL credentials again."
             )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error fetching team data from FPL.")


@router.get("/my-picks/{event_id}", summary="Get the user's weekly picks (squad + captain).")
async def get_current_users_picks(
    event_id: int,
    adapter: FPLAdapter = Depends(get_fpl_adapter),
    user: models.User = Depends(get_current_active_fpl_user)
):
    """
    Fetches the team selection for a specific Gameweek (event_id).
    """
    try:
        data = await adapter.get_entry_picks(user.fpl_manager_id, event_id, user.fpl_session_cookie)
        return data
    except Exception as e:
        logger.error(f"Picks fetch failed for user {user.id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error fetching picks data.")
