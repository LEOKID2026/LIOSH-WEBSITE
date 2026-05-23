/**
 * Generic in-memory rate limiter (no Redis/KV/ENV). Skipped outside production runtime.
 */

import { isProductionRuntime } from "./production-guard.js";

export const RATE_LIMIT_GENERIC_429 = { ok: false, error: "Too many requests" };

/** @type {Map<string, Map<string, { count: number, windowStart: number }>>} */
const namespaces = new Map();

function nowMs() {
  return Date.now();
}

export function clientIpFromRequest(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).trim();
  }
  return String(req.socket?.remoteAddress || "unknown").trim();
}

function getNamespaceStore(namespace) {
  if (!namespaces.has(namespace)) namespaces.set(namespace, new Map());
  return namespaces.get(namespace);
}

function pruneEntry(entry, now, windowMs) {
  if (!entry) return { count: 0, windowStart: now };
  if (now - entry.windowStart > windowMs) {
    return { count: 0, windowStart: now };
  }
  return entry;
}

/**
 * @param {{ namespace: string, keys: string[], maxAttempts: number, windowMs: number }}
 * @returns {{ allowed: boolean, retryAfterSec?: number }}
 */
export function consumeRateLimit({ namespace, keys, maxAttempts, windowMs }) {
  if (!isProductionRuntime()) {
    return { allowed: true };
  }

  const now = nowMs();
  const store = getNamespaceStore(namespace);
  const uniqueKeys = [...new Set(keys.filter(Boolean))];
  let tightestRetry = 0;

  for (const key of uniqueKeys) {
    const existing = store.get(key);
    const entry = pruneEntry(existing, now, windowMs);
    if (entry.count >= maxAttempts) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.windowStart + windowMs - now) / 1000));
      tightestRetry = tightestRetry ? Math.min(tightestRetry, retryAfterSec) : retryAfterSec;
    }
  }

  if (tightestRetry > 0) {
    return { allowed: false, retryAfterSec: tightestRetry };
  }

  for (const key of uniqueKeys) {
    const existing = store.get(key);
    const entry = pruneEntry(existing, now, windowMs);
    entry.count += 1;
    store.set(key, entry);
  }

  return { allowed: true };
}

/**
 * @returns {boolean} true when request was rejected
 */
export function rejectIfRateLimited(req, res, config) {
  const ip = clientIpFromRequest(req);
  const keys = [`ip:${ip}`, ...(config.extraKeys || [])].filter(Boolean);
  const result = consumeRateLimit({
    namespace: config.namespace,
    keys,
    maxAttempts: config.maxAttempts,
    windowMs: config.windowMs,
  });
  if (!result.allowed) {
    if (result.retryAfterSec) {
      res.setHeader("Retry-After", String(result.retryAfterSec));
    }
    res.status(429).json(RATE_LIMIT_GENERIC_429);
    return true;
  }
  return false;
}

/** Test-only reset */
export function _resetInMemoryRateLimitStateForTests() {
  namespaces.clear();
}
