import { safeGetJsonObject, safeSetJson } from "../../utils/safe-local-storage.js";
import { syncMonthlyProgressCacheFromServer } from "../../utils/progress-storage.js";
import { isStudentIdentityDebugEnabled } from "../student-identity-debug-flag.js";

/** @type {import("./studentLearningProfileClient").StudentLearningProfileResponse | null} */
let cachedProfile = null;

/**
 * @typedef {object} StudentLearningProfileResponse
 * @property {boolean} ok
 * @property {string} studentId
 * @property {object} row
 * @property {Record<string, Record<string, unknown>>} row.subjects
 * @property {Record<string, unknown>} row.monthly
 * @property {Record<string, unknown>} row.challenges
 * @property {Record<string, unknown>} row.streaks
 * @property {Record<string, unknown>} row.achievements
 * @property {Record<string, unknown>} row.profile
 * @property {object} derived
 */

export function getCachedStudentLearningProfile() {
  return cachedProfile;
}

/** @param {StudentLearningProfileResponse | null} p */
export function setCachedStudentLearningProfile(p) {
  cachedProfile = p;
}

/** Clear in-memory profile cache (e.g. after student logout). */
export function invalidateStudentLearningProfileClientCache() {
  cachedProfile = null;
}

export function namespacedLearningProfileStoragePrefix(studentId) {
  const id = String(studentId || "").trim();
  if (!id) return "liosh_lp_unknown_";
  return `liosh_lp_${id}_`;
}

/**
 * @param {string} studentId
 * @param {string} suffix
 * @param {unknown} value
 */
export function saveLocalCache(studentId, suffix, value) {
  if (typeof window === "undefined") return;
  const key = `${namespacedLearningProfileStoragePrefix(studentId)}${suffix}`;
  safeSetJson(key, value);
}

/**
 * @param {string} studentId
 * @param {string} suffix
 */
export function readLocalCache(studentId, suffix) {
  if (typeof window === "undefined") return {};
  const key = `${namespacedLearningProfileStoragePrefix(studentId)}${suffix}`;
  return safeGetJsonObject(key);
}

/**
 * Server wins for overlapping keys in shallow merge of subject blobs.
 * @param {string} studentId
 * @param {StudentLearningProfileResponse} serverResponse
 * @param {Record<string, unknown>} localSubjectBlob
 */
export function mergeServerProfileWithLocalCache(studentId, serverResponse, localSubjectBlob) {
  const serverSubj =
    serverResponse?.row?.subjects &&
    typeof serverResponse.row.subjects === "object" &&
    !Array.isArray(serverResponse.row.subjects)
      ? serverResponse.row.subjects
      : {};
  const sid = String(studentId || "").trim();
  if (!sid) return { ...localSubjectBlob, ...serverSubj };
  const out = { ...localSubjectBlob };
  for (const k of Object.keys(serverSubj)) {
    out[k] = serverSubj[k];
  }
  return out;
}

export async function fetchStudentLearningProfile() {
  const res = await fetch("/api/student/learning-profile", {
    credentials: "same-origin",
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    const msg = json?.error ? String(json.error) : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  setCachedStudentLearningProfile(json);
  if (json?.derived) {
    syncMonthlyProgressCacheFromServer(json.studentId, json.derived);
  }
  return json;
}

/**
 * @param {Record<string, unknown>} body
 */
export async function patchStudentLearningProfile(body) {
  if (isStudentIdentityDebugEnabled()) {
    try {
      console.info("[LIOSH learning-profile PATCH payload]", body);
    } catch {
      /* ignore */
    }
  }
  const res = await fetch("/api/student/learning-profile", {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    const msg = json?.error ? String(json.error) : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  setCachedStudentLearningProfile(json);
  if (json?.derived) {
    syncMonthlyProgressCacheFromServer(json.studentId, json.derived);
  }
  return json;
}

/** After finishing a learning session, refresh server-derived counters (monthly minutes, etc.). */
export async function refreshStudentLearningProfileAfterSession() {
  try {
    return await fetchStudentLearningProfile();
  } catch {
    return null;
  }
}

const debouncers = new Map();

/**
 * @param {string} key
 * @param {() => void | Promise<void>} fn
 * @param {number} [ms]
 */
export function debounceStudentLearningProfilePatch(key, fn, ms = 2200) {
  if (typeof window === "undefined") return;
  const prev = debouncers.get(key);
  if (prev) window.clearTimeout(prev);
  const id = window.setTimeout(() => {
    debouncers.delete(key);
    void Promise.resolve(fn()).catch(() => {});
  }, ms);
  debouncers.set(key, id);
}

export function flushDebouncedStudentLearningProfilePatch(key) {
  if (typeof window === "undefined") return;
  const prev = debouncers.get(key);
  if (prev) window.clearTimeout(prev);
  debouncers.delete(key);
}
