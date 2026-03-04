// src/lib/rateLimiter.ts
// Simple in-memory rate limiter for outgoing AI requests.
// Prevents exceeding Gemini free tier limits (10 RPM).

const MAX_REQUESTS_PER_MINUTE = 8; // Stay under the 10 RPM free tier ceiling
const WINDOW_MS = 60_000;          // 1 minute sliding window

const timestamps: number[] = [];

/**
 * Check if a request can proceed under rate limits.
 * Returns { allowed: true } or { allowed: false, retryAfterMs }.
 */
export function checkRateLimit(): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();

    // Remove timestamps older than the window
    while (timestamps.length > 0 && timestamps[0] < now - WINDOW_MS) {
        timestamps.shift();
    }

    if (timestamps.length >= MAX_REQUESTS_PER_MINUTE) {
        const oldestInWindow = timestamps[0];
        const retryAfterMs = oldestInWindow + WINDOW_MS - now;
        return { allowed: false, retryAfterMs };
    }

    // Record this request
    timestamps.push(now);
    return { allowed: true };
}
