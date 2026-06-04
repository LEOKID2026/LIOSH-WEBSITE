import {
  isTrackingDebugEnabled,
  trackingDebugRecordSession,
} from "./tracking-debug.js";
import { safeGetItem, safeSetJson, safeGetJsonArray } from "./safe-local-storage.js";

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
 * @param {string} [studentId] — when set, uses per-student namespaced cache (not authoritative vs server).
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
 * @param {Record<string, unknown>} data
 * @param {string} [studentId]
 */
export function saveMonthlyProgress(data, studentId) {
  if (typeof window === "undefined") return;
  safeSetJson(getMonthlyProgressStorageKey(studentId), data);
}

/**
 * @param {number} durationMinutes
 * @param {number} exercisesSolved
 * @param {Record<string, unknown>} meta
 * @param {{ studentId?: string }} [opts]
 */
export function addSessionProgress(durationMinutes, exercisesSolved, meta = {}, opts = {}) {
  if (!durationMinutes || durationMinutes <= 0) return;
  if (typeof window === "undefined") return;

  if (isTrackingDebugEnabled()) {
    trackingDebugRecordSession(meta);
  }

  const sessionDate = meta.date ? new Date(meta.date) : new Date();
  const ym = getYearMonth(sessionDate);
  const sid = opts.studentId != null && String(opts.studentId).trim() ? String(opts.studentId).trim() : "";
  const allProgress = loadMonthlyProgress(sid || undefined);
  const prev = allProgress[ym] || { totalMinutes: 0, totalExercises: 0 };

  allProgress[ym] = {
    totalMinutes: prev.totalMinutes + durationMinutes,
    totalExercises: prev.totalExercises + (exercisesSolved || 0),
  };

  saveMonthlyProgress(allProgress, sid || undefined);
  appendProgressLog(
    {
      id: Date.now(),
      date: sessionDate.toISOString(),
      minutes: durationMinutes,
      exercises: exercisesSolved || 0,
      subject: meta.subject || "general",
      topic: meta.topic || "",
      grade: meta.grade || "",
      mode: meta.mode || "",
      game: meta.game || "",
    },
    sid || undefined
  );
}

export function getCurrentYearMonth() {
  return getYearMonth();
}

/**
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

/**
 * @param {Record<string, unknown>} entry
 * @param {string} [studentId]
 */
function appendProgressLog(entry, studentId) {
  if (typeof window === "undefined") return;
  try {
    const key = getProgressLogStorageKey(studentId);
    const list = safeGetJsonArray(key);
    list.push(entry);
    while (list.length > 1000) {
      list.shift();
    }
    safeSetJson(key, list);
  } catch {
    /* ignore */
  }
}

