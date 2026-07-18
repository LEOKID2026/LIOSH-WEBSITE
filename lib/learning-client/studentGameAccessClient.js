import { safeGetJsonObject, safeSetJson } from "../../utils/safe-local-storage.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const SESSION_STORAGE_KEY = "liosh_student_game_access_v1";

/** @returns {Promise<{ ok: boolean, data: object | null, error: string | null }>} */
export async function fetchStudentGameAccessClient() {
  try {
    const res = await fetch("/api/student/game-access", { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      return { ok: false, data: null, error: json.error || "load_failed" };
    }
    return { ok: true, data: json, error: null };
  } catch {
    return { ok: false, data: null, error: "network_error" };
  }
}

/** @type {object | null} */
let cachedData = null;
/** @type {string | null} */
let cachedStudentId = null;
/** @type {number} */
let cachedAt = 0;
/** @type {Promise<{ ok: boolean, data: object | null, error: string | null }> | null} */
let inFlight = null;

function readSessionStorageCache(studentId) {
  if (typeof window === "undefined" || !studentId) return null;
  const stored = safeGetJsonObject(`${SESSION_STORAGE_KEY}_${studentId}`);
  const at = Number(stored?.at) || 0;
  const data = stored?.data && typeof stored.data === "object" ? stored.data : null;
  if (!data || Date.now() - at >= CACHE_TTL_MS) return null;
  return data;
}

function writeSessionStorageCache(studentId, data) {
  if (typeof window === "undefined" || !studentId || !data) return;
  safeSetJson(`${SESSION_STORAGE_KEY}_${studentId}`, { at: Date.now(), data });
}

/**
 * @param {string | null | undefined} studentId
 * @returns {object | null}
 */
export function getCachedStudentGameAccess(studentId) {
  const sid = String(studentId || "").trim();
  if (!sid) return null;
  if (cachedStudentId === sid && cachedData && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedData;
  }
  const fromStorage = readSessionStorageCache(sid);
  if (fromStorage) {
    cachedStudentId = sid;
    cachedData = fromStorage;
    cachedAt = Date.now();
    return fromStorage;
  }
  return cachedStudentId === sid ? cachedData : null;
}

/** @param {string} studentId @param {object} data */
export function setCachedStudentGameAccess(studentId, data) {
  const sid = String(studentId || "").trim();
  if (!sid || !data) return;
  cachedStudentId = sid;
  cachedData = data;
  cachedAt = Date.now();
  writeSessionStorageCache(sid, data);
}

/** @param {string | null | undefined} [studentId] */
export function invalidateStudentGameAccessClientCache(studentId) {
  if (studentId) {
    const sid = String(studentId).trim();
    if (cachedStudentId === sid) {
      cachedData = null;
      cachedStudentId = null;
      cachedAt = 0;
    }
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(`${SESSION_STORAGE_KEY}_${sid}`);
      } catch {
        /* ignore */
      }
    }
    return;
  }
  cachedData = null;
  cachedStudentId = null;
  cachedAt = 0;
  inFlight = null;
}

/**
 * @param {string | null | undefined} studentId
 * @param {{ force?: boolean, background?: boolean }} [options]
 */
export async function fetchStudentGameAccessCached(studentId, { force = false, background = false } = {}) {
  const sid = String(studentId || "").trim();
  if (!sid) {
    return { ok: false, data: null, error: "no_student", fromCache: false };
  }

  if (!force) {
    const cached = getCachedStudentGameAccess(sid);
    if (cached) {
      if (!background) {
        void fetchStudentGameAccessCached(sid, { force: true, background: true });
      }
      return { ok: true, data: cached, error: null, fromCache: true };
    }
  }

  if (inFlight) {
    const result = await inFlight;
    return { ...result, fromCache: false };
  }

  inFlight = (async () => {
    try {
      const result = await fetchStudentGameAccessClient();
      if (result.ok && result.data) {
        setCachedStudentGameAccess(sid, result.data);
      } else if (!background) {
        invalidateStudentGameAccessClientCache(sid);
      }
      return result;
    } finally {
      inFlight = null;
    }
  })();

  const result = await inFlight;
  return { ...result, fromCache: false };
}
