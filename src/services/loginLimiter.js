// Slows down password guessing: too many failed logins lock the login (per IP) for a while.
// Kept in memory, so it resets when the server restarts; enough for a single-server app.

const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS) || 5;
const WINDOW_MINUTES = Number(process.env.LOGIN_WINDOW_MINUTES) || 15;
const WINDOW_MS = WINDOW_MINUTES * 60 * 1000;
// Many different logins from one IP is also suspicious
const MAX_ATTEMPTS_PER_IP = MAX_ATTEMPTS * 4;

const failures = new Map(); // key -> { count, firstAt }

function keysFor(ip, identifier) {
  return [`id:${ip}:${String(identifier).toLowerCase()}`, `ip:${ip}`];
}

function entry(key) {
  const item = failures.get(key);
  if (item && Date.now() - item.firstAt > WINDOW_MS) {
    failures.delete(key);
    return null;
  }
  return item || null;
}

class LoginLimiter {
  // Seconds until the next attempt is allowed, or 0 if the attempt may go ahead
  static retryAfter(ip, identifier) {
    const [idKey, ipKey] = keysFor(ip, identifier);
    const limits = [[entry(idKey), MAX_ATTEMPTS], [entry(ipKey), MAX_ATTEMPTS_PER_IP]];

    let wait = 0;
    for (const [item, max] of limits) {
      if (item && item.count >= max) {
        wait = Math.max(wait, Math.ceil((item.firstAt + WINDOW_MS - Date.now()) / 1000));
      }
    }
    return wait;
  }

  static registerFailure(ip, identifier) {
    for (const key of keysFor(ip, identifier)) {
      const item = entry(key);
      if (item) item.count += 1;
      else failures.set(key, { count: 1, firstAt: Date.now() });
    }
  }

  static reset(ip, identifier) {
    failures.delete(keysFor(ip, identifier)[0]);
  }

  static get maxAttempts() {
    return MAX_ATTEMPTS;
  }
}

// Drop stale entries so the map does not grow forever
setInterval(() => {
  for (const key of failures.keys()) entry(key);
}, WINDOW_MS).unref();

module.exports = LoginLimiter;
