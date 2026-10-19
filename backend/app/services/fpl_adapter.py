from __future__ import annotations
import logging
import re
from typing import Optional, Any, Dict
import aiohttp
import asyncio
from datetime import timedelta, datetime, timezone

logger = logging.getLogger(__name__)

FPL_API = "https://fantasy.premierleague.com/api"

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


class FPLEntryNotFound(Exception):
    """FPL returned 404 for a manager ID - no such team."""


_ENTRY_URL_RE = re.compile(r"/entry/(\d+)")


def parse_manager_id(text: str) -> Optional[int]:
    """Accept a bare manager ID ("1234567") or any FPL URL containing
    /entry/<id>/ (e.g. the Points page, .../entry/1234567/event/8)."""
    text = text.strip()
    if text.isdigit():
        value = int(text)
    else:
        match = _ENTRY_URL_RE.search(text)
        if not match:
            return None
        value = int(match.group(1))
    return value if value > 0 else None


class FPLAdapter:
    """Thin client for FPL's public REST API.

    FPL moved its login to PingOne OIDC in 2026/27 and the old
    users.premierleague.com cookie login is gone, so this adapter only uses
    endpoints that need no FPL authentication.
    """

    def __init__(self, session: aiohttp.ClientSession):
        self._session = session

    async def _get_json(self, path: str) -> dict:
        async with self._session.get(f"{FPL_API}{path}") as resp:
            if resp.status == 404:
                raise FPLEntryNotFound(path)
            if resp.status != 200:
                raise Exception(f"FPL request {path} failed: {resp.status}")
            return await resp.json()

    # ------------------------
    # Public / cached endpoints
    # ------------------------
    async def bootstrap_static(self, ttl: int = 300) -> dict:
        cached = await _cache.get("bootstrap-static")
        if cached: return cached

        data = await self._get_json("/bootstrap-static/")
        await _cache.set("bootstrap-static", data, ttl_seconds=ttl)
        return data

    async def get_entry(self, entry_id: int, ttl: int = 3600, use_cache: bool = True) -> dict:
        """
        Gets public data for a specific FPL manager ID, including the classic
        leagues they've joined (used for ownership verification).
        Raises FPLEntryNotFound if FPL has no such manager.
        Pass use_cache=False when the caller needs to see a change made on FPL
        just now (FPL itself serves this endpoint with no-store).
        """
        cache_key = f"entry-{entry_id}"
        if use_cache:
            cached_data = await _cache.get(cache_key)
            if cached_data:
                return cached_data

        try:
            entry_data = await self._get_json(f"/entry/{entry_id}/")
        except FPLEntryNotFound:
            raise
        except Exception as e:
            logger.error(f"FPL API error fetching entry {entry_id}: {e}")
            # Raising a generic exception for the router to catch and re-raise as 404/500
            raise Exception(f"FPL Entry fetch failed: {e}")

        await _cache.set(cache_key, entry_data, ttl_seconds=ttl)
        return entry_data

    async def get_entry_picks(self, entry_id: int, event_id: int) -> dict:
        """Squad + captain for a gameweek. Public - no FPL login needed."""
        try:
            return await self._get_json(f"/entry/{entry_id}/event/{event_id}/picks/")
        except FPLEntryNotFound:
            raise
        except Exception as e:
            raise Exception(f"Failed to get picks: {e}")
