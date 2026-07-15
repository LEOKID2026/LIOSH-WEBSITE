import {
  isTrackingDebugEnabled,
  trackingDebugRecordSession,
} from "./tracking-debug.js";
import { safeGetItem, safeSetJson, safeGetJsonArray } from "./safe-local-storage.js";

/**
 * Phase 9 — NOT authoritative for product progress.
 * Monthly minutes / exercises truth: `computeStudentLearningDerived` via
 * GET /api/student/home-profile and GET /api/student/learning-profile.
 */

/** Parent / legacy UI (no student id): keep original global keys. */
const PROGRESS_STORAGE_KEY_GLOBAL = "LEO_MONTHLY_PROGRESS";
const PROGRESS_LOG_KEY_GLOBAL = "LEO_PROGRESS_LOG";

function nsMonthlyProgressKey(studentId) {
  return `liosh_lp_${String(studentId).trim()}_LEO_MONTHLY_PROGRESS`;
}
function nsProgressLogKey(studentId) {
  return `liosh_lp_${String(studentId).trim()}_LEO_PROGRESS_LOG`;
}

function getMonthlyProgressStorageKey(studentId) {
  const id = studentId != null && String(studentId).trim() ? String(studentId).trim() : "";
  return id ? nsMonthlyProgressKey(id) : PROGRESS_STORAGE_KEY_GLOBAL;
}

function getProgressLogStorageKey(studentId) {
  const id = studentId != null && String(studentId).trim() ? String(studentId).trim() : "";
  return id ? nsProgressLogKey(id) : PROGRESS_LOG_KEY_GLOBAL;
}

function getYearMonth(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Debug / legacy read only — not product authority.
 * @param {string} [studentId]
 */
export function loadMonthlyProgress(studentId) {
  if (typeof window === "undefined") return {};
  const raw = safeGetItem(getMonthlyProgressStorageKey(studentId));
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Overwrite local cache from server-derived monthly progress (server wins).
 * @param {string} [studentId]
 * @param {Record<string, unknown>|null|undefined} derived - `computeStudentLearningDerived` shape
 */
export function syncMonthlyProgressCacheFromServer(studentId, derived) {
  if (typeof window === "undefined" || !derived || typeof derived !== "object") return;
  const minutes = Number(
    derived.monthlyMinutesIsraelMonth ?? derived.monthlyMinutesUtcMonth
  );
  if (!Number.isFinite(minutes)) return;
  const ym =
    derived.yearMonthIsrael != null
      ? String(derived.yearMonthIsrael)
      : derived.yearMonthUtc != null
        ? String(derived.yearMonthUtc)
        : getCurrentYearMonth();
  const exercises = Number(
    derived.monthlyAnswersCountIsraelMonth ?? derived.monthlyAnswersCountUtcMonth ?? 0
  );
  const sid = studentId != null && String(studentId).trim() ? String(studentId).trim() : "";
  saveMonthlyProgress(
    {
      [ym]: {
        totalMinutes: Math.round(minutes * 100) / 100,
        totalExercises: Number.isFinite(exercises) ? Math.max(0, Math.floor(exercises)) : 0,
        _source: "server",
      },
    },
    sid || undefined
  );
}

/**
 * @param {Record<string, unknown>} data
 * @param {string} [studentId]
 */
export function saveMonthlyProgress(data, studentId) {
  if (typeof window === "undefined") return;
  safeSetJson(getMonthlyProgressStorageKey(studentId), data);
}

/**
 * Legacy hook — no longer writes product authority keys (Phase 9).
 * Tracking debug may still record session metadata when explicitly enabled.
 *
 * @param {number} durationMinutes
 * @param {number} exercisesSolved
 * @param {Record<string, unknown>} meta
 * @param {{ studentId?: string }} [opts]
 */
export function addSessionProgress(durationMinutes, exercisesSolved, meta = {}, opts = {}) {
  void durationMinutes;
  void exercisesSolved;
  void opts;
  if (isTrackingDebugEnabled()) {
    trackingDebugRecordSession(meta);
  }
}

export function getCurrentYearMonth() {
  return getYearMonth();
}

/**
 * Debug / legacy read only.
 * @param {string} [studentId]
 */
export function loadProgressLog(studentId) {
  if (typeof window === "undefined") return [];
  const raw = safeGetItem(getProgressLogStorageKey(studentId));
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
