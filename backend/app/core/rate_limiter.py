"""
In-memory sliding-window rate limiter.

Designed for a single-process deployment (Render free tier / single worker).
Each identifier (IP address or session ID) is allowed at most ``max_calls``
requests within a rolling ``window_seconds`` window.

For a multi-worker / multi-instance deployment, replace the in-memory store
with a shared Redis backend using the same interface.
"""
import time
import logging
from collections import defaultdict, deque
from threading import Lock
from typing import NamedTuple

logger = logging.getLogger(__name__)


class RateLimitResult(NamedTuple):
    """Result returned by :func:`check_rate_limit`."""

    allowed: bool
    """Whether the request should be permitted."""
    remaining: int
    """Calls remaining in the current window."""
    retry_after: float
    """Seconds to wait before the next call is allowed (0 if ``allowed=True``)."""


class SlidingWindowRateLimiter:
    """
    Thread-safe sliding-window rate limiter backed by an in-memory deque.

    Args:
        max_calls:      Maximum number of calls allowed per ``window_seconds``.
        window_seconds: Length of the sliding window in seconds.

    Example::

        limiter = SlidingWindowRateLimiter(max_calls=20, window_seconds=60)
        result = limiter.check("user-ip-or-session-id")
        if not result.allowed:
            raise HTTPException(429, "Too many requests")
    """

    def __init__(self, max_calls: int = 20, window_seconds: float = 60.0) -> None:
        self._max_calls = max_calls
        self._window = window_seconds
        # identifier → deque of call timestamps
        self._calls: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, identifier: str) -> RateLimitResult:
        """
        Check whether *identifier* is within its rate limit.

        Evicts expired timestamps, then either records the new call or
        rejects it and reports when the window will next allow a call.

        Args:
            identifier: A unique string per client — typically the client IP
                        address or an authenticated session/user ID.

        Returns:
            A :class:`RateLimitResult` describing whether the call is allowed.
        """
        now = time.monotonic()
        cutoff = now - self._window

        with self._lock:
            bucket: deque[float] = self._calls[identifier]

            # Evict timestamps outside the sliding window
            while bucket and bucket[0] < cutoff:
                bucket.popleft()

            call_count = len(bucket)

            if call_count >= self._max_calls:
                # Oldest call in the window tells us when a slot frees up
                retry_after = self._window - (now - bucket[0])
                logger.warning(
                    "Rate limit exceeded for identifier=%r (count=%d, limit=%d)",
                    identifier,
                    call_count,
                    self._max_calls,
                )
                return RateLimitResult(
                    allowed=False,
                    remaining=0,
                    retry_after=max(retry_after, 0.0),
                )

            bucket.append(now)
            return RateLimitResult(
                allowed=True,
                remaining=self._max_calls - call_count - 1,
                retry_after=0.0,
            )

    def reset(self, identifier: str) -> None:
        """Clear all recorded calls for *identifier* (useful in tests)."""
        with self._lock:
            self._calls.pop(identifier, None)


# ---------------------------------------------------------------------------
# Module-level singleton — shared across all requests in the same process.
# Limits are intentionally conservative for an AI-backed endpoint.
# ---------------------------------------------------------------------------
ai_rate_limiter = SlidingWindowRateLimiter(max_calls=20, window_seconds=60.0)
