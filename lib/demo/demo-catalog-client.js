import { safeGetJsonObject, safeSetJson } from "../../utils/safe-local-storage.js";

const CACHE_TTL_MS = 10 * 60 * 1000;
const SESSION_STORAGE_PREFIX = "liosh_demo_catalog_v1";

/** @type {Map<string, { data: object, at: number }>} */
const memoryByGrade = new Map();
/** @type {Map<string, Promise<object | null>>} */
const inFlightByGrade = new Map();

function storageKey(gradeLevel) {
  return `${SESSION_STORAGE_PREFIX}_${String(gradeLevel || "g3").trim()}`;
}

/**
 * @param {string} gradeLevel
 * @returns {object | null}
 */
export function getCachedDemoCatalog(gradeLevel) {
  const grade = String(gradeLevel || "g3").trim();
  const mem = memoryByGrade.get(grade);
  if (mem && Date.now() - mem.at < CACHE_TTL_MS) {
    return mem.data;
  }
  if (typeof window === "undefined") return null;
  const stored = safeGetJsonObject(storageKey(grade));
  const at = Number(stored?.at) || 0;
  const data = stored?.data && typeof stored.data === "object" ? stored.data : null;
  if (!data || Date.now() - at >= CACHE_TTL_MS) return null;
  memoryByGrade.set(grade, { data, at });
  return data;
}

/** @param {string} gradeLevel @param {object} data */
export function setCachedDemoCatalog(gradeLevel, data) {
  const grade = String(gradeLevel || "g3").trim();
  if (!data) return;
  const at = Date.now();
  memoryByGrade.set(grade, { data, at });
  if (typeof window !== "undefined") {
    safeSetJson(storageKey(grade), { at, data });
  }
}

export function invalidateDemoCatalogCache(gradeLevel) {
  if (gradeLevel) {
    const grade = String(gradeLevel).trim();
    memoryByGrade.delete(grade);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(storageKey(grade));
      } catch {
        /* ignore */
      }
    }
    inFlightByGrade.delete(grade);
    return;
  }
  memoryByGrade.clear();
  inFlightByGrade.clear();
}

/**
 * @param {string} gradeLevel
 * @param {{ force?: boolean, background?: boolean }} [options]
 * @returns {Promise<{ ok: boolean, data: object | null, fromCache: boolean }>}
 */
export async function fetchDemoCatalogClient(gradeLevel, { force = false, background = false } = {}) {
  const grade = String(gradeLevel || "g3").trim();

  if (!force) {
    const cached = getCachedDemoCatalog(grade);
    if (cached) {
      if (!background) {
        void fetchDemoCatalogClient(grade, { force: true, background: true });
      }
      return { ok: true, data: cached, fromCache: true };
    }
  }

  const existing = inFlightByGrade.get(grade);
  if (existing) {
    const data = await existing;
    return { ok: Boolean(data), data, fromCache: false };
  }

  const promise = (async () => {
    try {
      const res = await fetch(`/api/demo/catalog?gradeLevel=${encodeURIComponent(grade)}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        if (!background) invalidateDemoCatalogCache(grade);
        return null;
      }
      setCachedDemoCatalog(grade, json);
      return json;
    } catch {
      if (!background) invalidateDemoCatalogCache(grade);
      return null;
    } finally {
      inFlightByGrade.delete(grade);
    }
  })();

  inFlightByGrade.set(grade, promise);
  const data = await promise;
  return { ok: Boolean(data), data, fromCache: false };
}
