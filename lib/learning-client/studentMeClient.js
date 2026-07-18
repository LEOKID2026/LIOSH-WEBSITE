/** @typedef {{ ok?: boolean, student?: { id: string, full_name?: string, grade_level?: string|null, coin_balance?: number, is_active?: boolean }, allowStudentGradePicker?: boolean, subjectPermissions?: Record<string, unknown>, guestPolicy?: object }} StudentMeResponse */

import { safeGetJsonObject, safeSetJson } from "../../utils/safe-local-storage.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const SESSION_STORAGE_KEY = "liosh_student_me_v1";

/** @type {StudentMeResponse | null} */
let cachedStudentMe = null;
/** @type {number} */
let cachedAt = 0;
/** @type {Promise<StudentMeResponse | null> | null} */
let inFlight = null;

function readSessionStorageCache() {
  if (typeof window === "undefined") return null;
  const stored = safeGetJsonObject(SESSION_STORAGE_KEY);
  const at = Number(stored?.at) || 0;
  const payload = stored?.payload && typeof stored.payload === "object" ? stored.payload : null;
  if (!payload?.student?.id || Date.now() - at >= CACHE_TTL_MS) return null;
  return payload;
}

function writeSessionStorageCache(payload) {
  if (typeof window === "undefined" || !payload?.student?.id) return;
  safeSetJson(SESSION_STORAGE_KEY, { at: Date.now(), payload });
}

/** @returns {StudentMeResponse | null} */
export function getCachedStudentMe() {
  if (cachedStudentMe?.student?.id && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedStudentMe;
  }
  const fromStorage = readSessionStorageCache();
  if (fromStorage) {
    cachedStudentMe = fromStorage;
    cachedAt = Date.now();
    return fromStorage;
  }
  return cachedStudentMe?.student?.id ? cachedStudentMe : null;
}

/** @param {StudentMeResponse | null} payload */
export function setCachedStudentMe(payload) {
  cachedStudentMe = payload && typeof payload === "object" ? payload : null;
  cachedAt = cachedStudentMe?.student?.id ? Date.now() : 0;
  if (cachedStudentMe?.student?.id) {
    writeSessionStorageCache(cachedStudentMe);
  }
}

export function invalidateStudentMeClientCache() {
  cachedStudentMe = null;
  cachedAt = 0;
  inFlight = null;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {{ force?: boolean, background?: boolean }} [options]
 * @returns {Promise<{ ok: boolean, payload: StudentMeResponse | null, fromCache: boolean }>}
 */
export async function fetchStudentMeClient({ force = false, background = false } = {}) {
  if (!force) {
    const cached = getCachedStudentMe();
    if (cached?.student?.id) {
      if (!background) {
        void fetchStudentMeClient({ force: true, background: true });
      }
      return { ok: true, payload: cached, fromCache: true };
    }
  }

  if (inFlight) {
    const payload = await inFlight;
    return { ok: Boolean(payload?.student?.id), payload, fromCache: false };
  }

  inFlight = (async () => {
    try {
      const res = await fetch("/api/student/me", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload?.student?.id) {
        setCachedStudentMe(payload);
        return payload;
      }
      if (!background) {
        invalidateStudentMeClientCache();
      }
      return null;
    } catch {
      if (!background) {
        invalidateStudentMeClientCache();
      }
      return null;
    } finally {
      inFlight = null;
    }
  })();

  const payload = await inFlight;
  return { ok: Boolean(payload?.student?.id), payload, fromCache: false };
}
