import { safeGetJsonObject, safeSetJson } from "../../utils/safe-local-storage.js";

const CACHE_TTL_MS = 5 * 60 * 1000;
const STORAGE_PREFIX = "liosh_student_cards_v1";

/** @type {Map<string, { at: number, summary: object | null, tabs: Record<string, object> }>} */
const memoryByStudent = new Map();

function storageKey(studentId) {
  return `${STORAGE_PREFIX}_${String(studentId || "").trim()}`;
}

function readStorage(studentId) {
  if (typeof window === "undefined") return null;
  const stored = safeGetJsonObject(storageKey(studentId));
  if (!stored || typeof stored !== "object") return null;
  const at = Number(stored.at) || 0;
  if (Date.now() - at >= CACHE_TTL_MS) return null;
  return stored;
}

function writeStorage(studentId, payload) {
  if (typeof window === "undefined") return;
  safeSetJson(storageKey(studentId), payload);
}

function ensureStudentCache(studentId) {
  const sid = String(studentId || "").trim();
  if (!sid) return null;
  let mem = memoryByStudent.get(sid);
  if (!mem) {
    const stored = readStorage(sid);
    mem = stored
      ? { at: stored.at, summary: stored.summary || null, tabs: stored.tabs || {} }
      : { at: Date.now(), summary: null, tabs: {} };
    memoryByStudent.set(sid, mem);
  }
  return mem;
}

/** @param {string} studentId @param {string} tabId */
export function getCachedCardsTab(studentId, tabId) {
  const cache = ensureStudentCache(studentId);
  if (!cache) return null;
  if (Date.now() - cache.at >= CACHE_TTL_MS) return null;
  return cache.tabs?.[tabId] || null;
}

/** @param {string} studentId */
export function getCachedCardsSummary(studentId) {
  const cache = ensureStudentCache(studentId);
  if (!cache || Date.now() - cache.at >= CACHE_TTL_MS) return null;
  return cache.summary;
}

/** @param {string} studentId @param {string} tabId @param {object} data */
export function setCachedCardsTab(studentId, tabId, data) {
  const sid = String(studentId || "").trim();
  if (!sid || !tabId || !data) return;
  const cache = ensureStudentCache(sid) || { at: Date.now(), summary: null, tabs: {} };
  cache.tabs[tabId] = data;
  cache.at = Date.now();
  memoryByStudent.set(sid, cache);
  writeStorage(sid, cache);
}

/** @param {string} studentId @param {object} summary */
export function setCachedCardsSummary(studentId, summary) {
  const sid = String(studentId || "").trim();
  if (!sid) return;
  const cache = ensureStudentCache(sid) || { at: Date.now(), summary: null, tabs: {} };
  cache.summary = summary;
  cache.at = Date.now();
  memoryByStudent.set(sid, cache);
  writeStorage(sid, cache);
}

/** @param {string | null | undefined} [studentId] */
export function isStudentCardsCacheStale(studentId) {
  const sid = String(studentId || "").trim();
  if (!sid) return true;
  const mem = memoryByStudent.get(sid);
  if (mem) return Date.now() - mem.at >= CACHE_TTL_MS;
  const stored = readStorage(sid);
  if (!stored) return true;
  return Date.now() - stored.at >= CACHE_TTL_MS;
}

/** @param {string | null | undefined} [studentId] */
export function invalidateStudentCardsCache(studentId) {
  if (studentId) {
    const sid = String(studentId).trim();
    memoryByStudent.delete(sid);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(storageKey(sid));
      } catch {
        /* ignore */
      }
    }
    return;
  }
  memoryByStudent.clear();
}
