from __future__ import annotations
import logging
from typing import Optional, Any, Dict
import aiohttp
from fpl import FPL
import asyncio
from datetime import timedelta, datetime, timezone

logger = logging.getLogger(__name__)

# --- Caching Logic (Unchanged) ---
class SimpleTTLCache:
    def __init__(self):
        self._store: Dict[str, tuple[datetime, Any]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str):
        async with self._lock:
            v = self._store.get(key)
            if not v: return None
            exp, data = v
            if datetime.now(timezone.utc) > exp:
                del self._store[key]
                return None
            return data

    async def set(self, key: str, data: Any, ttl_seconds: int = 60):
        async with self._lock:
            self._store[key] = (datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds), data)

_cache = SimpleTTLCache()

class FPLAdapter:
    def __init__(self, session: aiohttp.ClientSession):
        self._session = session
        self._fpl = FPL(session)

    # ------------------------
    # Public / cached endpoints
    # ------------------------
    async def bootstrap_static(self, ttl: int = 300) -> dict:
        cached = await _cache.get("bootstrap-static")
        if cached: return cached
        
        data = await self._fpl.get_bootstrap_static()
        await _cache.set("bootstrap-static", data, ttl_seconds=ttl)
        return data

    # ------------------------
    # Authentication Flow (UPDATED)
    # ------------------------
    async def login_and_get_details(self, email: str, password: str) -> Dict[str, Any]:
        """
        1. Logs into FPL using the library.
        2. Fetches the Manager ID (entry_id) from /api/me/.
        3. Returns the ID and the Session Cookie string.
        """
        try:
            # 1. Perform Login (Updates the aiohttp session cookie jar internally)
            await self._fpl.login(email, password)
            
            # 2. Fetch User Details to get Manager ID
            # We access the session directly because the library might not expose /api/me easily
            async with self._session.get("https://fantasy.premierleague.com/api/me/") as resp:
                if resp.status != 200:
                    raise Exception("Login successful, but failed to fetch user details.")
                me_data = await resp.json()
                
            # Extract Manager ID (entry)
            player = me_data.get('player', {})
            entry_id = player.get('entry')
            
            if not entry_id:
                raise Exception("User does not have an FPL Team (Entry ID not found).")

            # 3. Extract Cookies to return to Frontend
            # We filter for 'pl_profile' which is the essential auth cookie
            cookies = self._session.cookie_jar.filter_cookies("https://fantasy.premierleague.com")
            pl_profile = cookies.get("pl_profile")
            
            if not pl_profile:
                raise Exception("Session cookie not found after login.")

            # Clear session cookies to keep adapter clean for next request
            self._session.cookie_jar.clear()

            return {
                "manager_id": entry_id,
                "cookie": pl_profile.value 
            }

        except Exception as e:
            logger.error(f"Login failed: {str(e)}")
            # Ensure we clean up even on failure
            self._session.cookie_jar.clear()
            raise e

    # ------------------------
    # Private endpoints (Require Cookie Injection)
    # ------------------------
    async def get_entry_picks(self, entry_id: int, event_id: int, auth_cookie: str) -> dict:
        """
        Fetches picks.
        IMPORTANT: This creates a temporary session context with the user's cookie.
        """
        # 1. Inject the cookie from the frontend request into the session
        self._session.cookie_jar.update_cookies({"pl_profile": auth_cookie})
        
        try:
            # 2. Call the protected endpoint
            # Note: We use get_entry_picks (which is generally public)
            # BUT if you need 'my-team' (which includes bank/transfers), use:
            # await self._session.get(f"https://fantasy.premierleague.com/api/my-team/{entry_id}/")
            
            picks = await self._fpl.get_entry_picks(entry_id, event_id)
            return picks
        finally:
            # 3. CLEAN UP: Remove cookies so we don't leak this user's session to others
            self._session.cookie_jar.clear()
    
    async def get_entry(self, entry_id: int, ttl: int = 3600) -> dict:
        """
        Gets public data for a specific FPL manager ID.
        This is public data and can be cached aggressively.
        """
        cache_key = f"entry-{entry_id}"
        cached_data = await _cache.get(cache_key)

        if cached_data:
            return cached_data

        try:
            # Use the underlying FPL client method
            entry = await self._fpl.get_entry(entry_id)
            # Convert the FPL object to a dictionary for FastAPI response and caching
            entry_data = entry.__dict__ 

            # Cache the result for 1 hour (public data)
            await _cache.set(cache_key, entry_data, ttl_seconds=ttl) 
            return entry_data
        except Exception as e:
            logger.error(f"FPL API error fetching entry {entry_id}: {e}")
            # Raising a generic exception for the router to catch and re-raise as 404/500
            raise Exception(f"FPL Entry fetch failed: {e}")

    async def get_my_team(self, entry_id: int, auth_cookie: str) -> dict:
        """
        Wrapper for the /my-team/ endpoint which requires Auth.
        The fpl library doesn't strictly have a 'get_my_team' that returns the transfer info,
        so we use the session directly.
        """
        self._session.cookie_jar.update_cookies({"pl_profile": auth_cookie})
        
        try:
            url = f"https://fantasy.premierleague.com/api/my-team/{entry_id}/"
            async with self._session.get(url) as resp:
                if resp.status != 200:
                    raise Exception(f"Failed to get team: {resp.status}")
                return await resp.json()
        finally:
            self._session.cookie_jar.clear()