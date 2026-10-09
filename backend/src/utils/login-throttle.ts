const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;

/**
 * Failed logins per email + IP in a 15-minute window (in memory: enough for a
 * single API instance). A Map keyed by "email|ip" makes each check O(1) and
 * old windows are dropped lazily on access, plus a sweep when it grows.
 */
const failures = new Map<string, { count: number; firstAt: number }>();

function keyOf(email: string, ip: string) {
  return `${email.trim().toLowerCase()}|${ip}`;
}

function sweep(now: number) {
  if (failures.size < 1000) return;
  for (const [key, entry] of failures) if (now - entry.firstAt >= WINDOW_MS) failures.delete(key);
}

export const loginThrottle = {
  /** Seconds until the next attempt is allowed, or 0 when it is allowed now. */
  retryAfterSeconds(email: string, ip: string): number {
    const now = Date.now();
    const entry = failures.get(keyOf(email, ip));
    if (!entry) return 0;
    if (now - entry.firstAt >= WINDOW_MS) {
      failures.delete(keyOf(email, ip));
      return 0;
    }
    return entry.count >= MAX_FAILURES ? Math.ceil((entry.firstAt + WINDOW_MS - now) / 1000) : 0;
  },

  /** Returns the number of failures in the current window (after this one). */
  fail(email: string, ip: string): number {
    const now = Date.now();
    sweep(now);
    const key = keyOf(email, ip);
    const entry = failures.get(key);
    if (!entry || now - entry.firstAt >= WINDOW_MS) {
      failures.set(key, { count: 1, firstAt: now });
      return 1;
    }
    entry.count++;
    return entry.count;
  },

  clear(email: string, ip: string) {
    failures.delete(keyOf(email, ip));
  },
};
