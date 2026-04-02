# backend/rate_limiter.py
# Simple in-memory rate limiter for outgoing AI requests.
# Prevents exceeding Gemini free tier limits (10 RPM).

import time

MAX_REQUESTS_PER_MINUTE = 8  # Stay under the 10 RPM free tier ceiling
WINDOW_MS = 60_000  # 1 minute sliding window

_timestamps: list[float] = []


def check_rate_limit() -> dict:
    """
    Check if a request can proceed under rate limits.
    Returns {"allowed": True} or {"allowed": False, "retry_after_ms": int}.
    """
    now = time.time() * 1000  # ms

    # Remove timestamps older than the window
    while _timestamps and _timestamps[0] < now - WINDOW_MS:
        _timestamps.pop(0)

    if len(_timestamps) >= MAX_REQUESTS_PER_MINUTE:
        oldest_in_window = _timestamps[0]
        retry_after_ms = oldest_in_window + WINDOW_MS - now
        return {"allowed": False, "retry_after_ms": retry_after_ms}

    # Record this request
    _timestamps.append(now)
    return {"allowed": True}
