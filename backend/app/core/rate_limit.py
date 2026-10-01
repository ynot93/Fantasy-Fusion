from __future__ import annotations
import time
from fastapi import HTTPException, status


class FixedWindowRateLimiter:
    """
    In-process, per-key fixed-window rate limiter.

    Not shared across multiple backend workers/processes - fine for a single
    uvicorn process, but a Redis-backed limiter would be needed if this
    backend ever scales out to multiple instances.
    """

    def __init__(self, max_attempts: int, window_seconds: int):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = {}

    def check(self, key: str) -> None:
        now = time.monotonic()
        window_start = now - self.window_seconds
        hits = [t for t in self._hits.get(key, []) if t > window_start]
        if len(hits) >= self.max_attempts:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again later.",
            )
        hits.append(now)
        self._hits[key] = hits

    def reset(self) -> None:
        self._hits.clear()


fpl_login_rate_limiter = FixedWindowRateLimiter(max_attempts=5, window_seconds=15 * 60)
