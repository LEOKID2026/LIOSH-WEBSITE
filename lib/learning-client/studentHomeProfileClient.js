/**
 * Client cache for student home dashboard payloads (summary + optional analytics).
 * Stale-while-revalidate: show last good data immediately on return navigation.
 */

import { safeGetJsonObject, safeSetJson } from "../../utils/safe-local-storage.js";

const CACHE_TTL_MS = 90_000;
const STORAGE_SUFFIX = "home_dashboard_v1";

/** @type {{ studentId: string | null, summary: object | null, analytics: object | null, at: number }} */
let memoryCache = {
  studentId: null,
  summary: null,
  analytics: null,
  at: 0,
};

function storageKey(studentId) {
  return `liosh_${String(studentId || "").trim()}_${STORAGE_SUFFIX}`;
}

/**
 * @param {object | null | undefined} summary
 * @param {object | null | undefined} analytics
 */
export function mergeStudentHomePayloads(summary, analytics) {
  const base = summary && typeof summary === "object" ? summary : {};
  const extra = analytics && typeof analytics === "object" ? analytics : {};
  return {
    ...base,
    ...extra,
    challenges: extra.challenges ?? base.challenges,
    accountSnapshot: extra.accountSnapshot ?? base.accountSnapshot,
    derivedPending: extra.derivedPending ?? base.derivedPending ?? !extra.derived,
  };
}

/**
 * @param {string} studentId
 */
export function getCachedStudentHomePayload(studentId) {
  const sid = String(studentId || "").trim();
  if (!sid) return null;

  const now = Date.now();
  if (
    memoryCache.studentId === sid &&
    memoryCache.summary &&
    now - memoryCache.at < CACHE_TTL_MS
  ) {
    return {
      summary: memoryCache.summary,
      analytics: memoryCache.analytics,
      merged: mergeStudentHomePayloads(memoryCache.summary, memoryCache.analytics),
      fromMemory: true,
    };
  }

  if (typeof window === "undefined") return null;
  const stored = safeGetJsonObject(storageKey(sid));
  const at = Number(stored?.at) || 0;
  const summary = stored?.summary && typeof stored.summary === "object" ? stored.summary : null;
  if (!summary || now - at >= CACHE_TTL_MS) return null;

  const analytics =
    stored?.analytics && typeof stored.analytics === "object" ? stored.analytics : null;
  memoryCache = { studentId: sid, summary, analytics, at };

  return {
    summary,
    analytics,
    merged: mergeStudentHomePayloads(summary, analytics),
    fromMemory: false,
  };
}

/**
 * @param {string} studentId
 * @param {{ summary?: object | null, analytics?: object | null }} parts
 */
export function setCachedStudentHomePayload(studentId, parts = {}) {
  const sid = String(studentId || "").trim();
  if (!sid) return;

  const prev = getCachedStudentHomePayload(sid);
  const summary =
    parts.summary && typeof parts.summary === "object"
      ? parts.summary
      : prev?.summary ?? memoryCache.summary;
  const analytics =
    parts.analytics !== undefined
      ? parts.analytics && typeof parts.analytics === "object"
        ? parts.analytics
        : null
      : prev?.analytics ?? memoryCache.analytics;

  const at = Date.now();
  memoryCache = { studentId: sid, summary, analytics, at };

  if (typeof window !== "undefined" && summary) {
    safeSetJson(storageKey(sid), { at, summary, analytics });
  }
}

export function invalidateStudentHomeProfileClientCache(studentId) {
  if (studentId) {
    if (memoryCache.studentId === studentId) {
      memoryCache = { studentId: null, summary: null, analytics: null, at: 0 };
    }
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(storageKey(studentId));
        window.sessionStorage.removeItem(grantsStorageKey(studentId));
      } catch {
        /* ignore */
      }
    }
    return;
  }
  memoryCache = { studentId: null, summary: null, analytics: null, at: 0 };
}

const GRANTS_CLIENT_COOLDOWN_MS = 10 * 60 * 1000;
const GRANTS_STORAGE_SUFFIX = "home_achievement_grants_v1";

/** @type {Promise<unknown> | null} */
let grantsFetchInFlight = null;

function grantsStorageKey(studentId) {
  return `liosh_${String(studentId || "").trim()}_${GRANTS_STORAGE_SUFFIX}`;
}

/**
 * @param {string} studentId
 */
export function shouldSkipClientAchievementGrants(studentId) {
  const sid = String(studentId || "").trim();
  if (!sid || typeof window === "undefined") return false;
  try {
    const raw = window.sessionStorage.getItem(grantsStorageKey(sid));
    if (!raw) return false;
    const at = Number(JSON.parse(raw)?.at) || 0;
    return Date.now() - at < GRANTS_CLIENT_COOLDOWN_MS;
  } catch {
    return false;
  }
}

/**
 * @param {string} studentId
 */
export function markClientAchievementGrantsCompleted(studentId) {
  const sid = String(studentId || "").trim();
  if (!sid || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(grantsStorageKey(sid), JSON.stringify({ at: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function getClientAchievementGrantsInFlight() {
  return grantsFetchInFlight;
}

/**
 * @param {Promise<unknown>} promise
 */
export function setClientAchievementGrantsInFlight(promise) {
  grantsFetchInFlight = promise;
}

export function clearClientAchievementGrantsInFlight() {
  grantsFetchInFlight = null;
}
