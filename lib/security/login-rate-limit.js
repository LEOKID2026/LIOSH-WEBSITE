/**
 * In-memory pilot-safe login rate limiting (no Redis/KV — ENV deferred).
 * Tracks per-IP and per-credential buckets with progressive lockout.
 */

const WINDOW_MS = 10 * 60 * 1000;
const IP_MAX_ATTEMPTS = 30;
const CREDENTIAL_MAX_ATTEMPTS = 10;

const LOCKOUT_STEPS = [
  { fails: 5, ms: 30 * 1000 },
  { fails: 10, ms: 5 * 60 * 1000 },
  { fails: 20, ms: 60 * 60 * 1000 },
  { fails: 50, ms: 24 * 60 * 60 * 1000 },
];

/** @type {Map<string, { count: number, windowStart: number, fails: number, lockedUntil: number }>} */
const buckets = new Map();

function nowMs() {
  return Date.now();
}

function pruneBucket(entry, now) {
  if (!entry) return null;
  if (now - entry.windowStart > WINDOW_MS) {
    return { count: 0, windowStart: now, fails: entry.fails || 0, lockedUntil: entry.lockedUntil || 0 };
  }
  return entry;
}

function getBucket(key) {
  const now = nowMs();
  const existing = buckets.get(key);
  const entry = pruneBucket(existing, now) || { count: 0, windowStart: now, fails: 0, lockedUntil: 0 };
  buckets.set(key, entry);
  return entry;
}

function lockoutMsForFails(fails) {
  let lockMs = 0;
  for (const step of LOCKOUT_STEPS) {
    if (fails >= step.fails) lockMs = step.ms;
  }
  return lockMs;
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).trim();
  }
  return String(req.socket?.remoteAddress || "unknown").trim();
}

function credentialKey(normalizedCredential) {
  const cred = String(normalizedCredential || "").trim().toLowerCase();
  return cred ? `cred:${cred}` : "cred:empty";
}

/**
 * @returns {{ allowed: boolean, retryAfterSec?: number }}
 */
export function checkLoginRateLimit(req, normalizedCredential) {
  const now = nowMs();
  const ipKey = `ip:${clientIp(req)}`;
  const credKey = credentialKey(normalizedCredential);

  for (const key of [ipKey, credKey]) {
    const entry = getBucket(key);
    if (entry.lockedUntil && entry.lockedUntil > now) {
      return { allowed: false, retryAfterSec: Math.ceil((entry.lockedUntil - now) / 1000) };
    }
    const max = key.startsWith("ip:") ? IP_MAX_ATTEMPTS : CREDENTIAL_MAX_ATTEMPTS;
    if (entry.count >= max) {
      const lockMs = lockoutMsForFails(entry.fails || entry.count);
      entry.lockedUntil = now + Math.max(lockMs, 60 * 1000);
      buckets.set(key, entry);
      return { allowed: false, retryAfterSec: Math.ceil((entry.lockedUntil - now) / 1000) };
    }
  }

  return { allowed: true };
}

export function recordLoginFailure(req, normalizedCredential) {
  const now = nowMs();
  for (const key of [`ip:${clientIp(req)}`, credentialKey(normalizedCredential)]) {
    const entry = getBucket(key);
    entry.count += 1;
    entry.fails = (entry.fails || 0) + 1;
    const lockMs = lockoutMsForFails(entry.fails);
    if (lockMs > 0) {
      entry.lockedUntil = Math.max(entry.lockedUntil || 0, now + lockMs);
    }
    buckets.set(key, entry);
  }
}

export function recordLoginSuccess(req, normalizedCredential) {
  const now = nowMs();
  for (const key of [`ip:${clientIp(req)}`, credentialKey(normalizedCredential)]) {
    const entry = getBucket(key);
    entry.fails = 0;
    entry.lockedUntil = 0;
    entry.count = 0;
    entry.windowStart = now;
    buckets.set(key, entry);
  }
}

/** Test-only reset */
export function _resetLoginRateLimitStateForTests() {
  buckets.clear();
}
