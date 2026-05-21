import {
  isTrackingDebugEnabled,
  trackingDebugRecordSession,
} from "./tracking-debug.js";
import { safeGetItem, safeSetJson, safeGetJsonArray } from "./safe-local-storage.js";

/** Parent / legacy UI (no student id): keep original global keys. */
const PROGRESS_STORAGE_KEY_GLOBAL = "LEO_MONTHLY_PROGRESS";
const PROGRESS_LOG_KEY_GLOBAL = "LEO_PROGRESS_LOG";
const REWARD_CHOICE_KEY_GLOBAL = "LEO_REWARD_CHOICE";
const REWARD_CELEBRATION_KEY_GLOBAL = "LEO_REWARD_CELEBRATION";

function nsMonthlyProgressKey(studentId) {
  return `liosh_lp_${String(studentId).trim()}_LEO_MONTHLY_PROGRESS`;
}
function nsProgressLogKey(studentId) {
  return `liosh_lp_${String(studentId).trim()}_LEO_PROGRESS_LOG`;
}
function nsRewardChoiceKey(studentId) {
  return `liosh_lp_${String(studentId).trim()}_LEO_REWARD_CHOICE`;
}
function nsRewardCelebrationKey(studentId) {
  return `liosh_lp_${String(studentId).trim()}_LEO_REWARD_CELEBRATION`;
}

function getMonthlyProgressStorageKey(studentId) {
  const id = studentId != null && String(studentId).trim() ? String(studentId).trim() : "";
  return id ? nsMonthlyProgressKey(id) : PROGRESS_STORAGE_KEY_GLOBAL;
}

function getProgressLogStorageKey(studentId) {
  const id = studentId != null && String(studentId).trim() ? String(studentId).trim() : "";
  return id ? nsProgressLogKey(id) : PROGRESS_LOG_KEY_GLOBAL;
}

function getRewardChoiceStorageKey(studentId) {
  const id = studentId != null && String(studentId).trim() ? String(studentId).trim() : "";
  return id ? nsRewardChoiceKey(id) : REWARD_CHOICE_KEY_GLOBAL;
}

function getRewardCelebrationStorageKey(studentId) {
  const id = studentId != null && String(studentId).trim() ? String(studentId).trim() : "";
  return id ? nsRewardCelebrationKey(id) : REWARD_CELEBRATION_KEY_GLOBAL;
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

/**
 * @param {string} yearMonth
 * @param {string} [studentId]
 */
export function loadRewardChoice(yearMonth, studentId) {
  if (typeof window === "undefined") return null;
  const raw = safeGetItem(getRewardChoiceStorageKey(studentId));
  if (!raw) return null;
  try {
    const all = JSON.parse(raw);
    return all[yearMonth] || null;
  } catch {
    return null;
  }
}

/**
 * @param {string} yearMonth
 * @param {string} choiceKey
 * @param {string} [studentId]
 */
export function saveRewardChoice(yearMonth, choiceKey, studentId) {
  if (typeof window === "undefined") return;
  const raw = safeGetItem(getRewardChoiceStorageKey(studentId));
  let all = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed != null && typeof parsed === "object" && !Array.isArray(parsed)) {
        all = parsed;
      }
    } catch {
      /* keep {} */
    }
  }
  all[yearMonth] = choiceKey;
  safeSetJson(getRewardChoiceStorageKey(studentId), all);
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

/**
 * @param {string} yearMonth
 * @param {string} [studentId]
 */
export function hasRewardCelebrationShown(yearMonth, studentId) {
  if (typeof window === "undefined") return false;
  const raw = safeGetItem(getRewardCelebrationStorageKey(studentId));
  if (!raw) return false;
  try {
    const all = JSON.parse(raw);
    return Boolean(all[yearMonth]);
  } catch {
    return false;
  }
}

/**
 * @param {string} yearMonth
 * @param {string} [studentId]
 */
export function markRewardCelebrationShown(yearMonth, studentId) {
  if (typeof window === "undefined") return;
  const raw = safeGetItem(getRewardCelebrationStorageKey(studentId));
  let all = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed != null && typeof parsed === "object" && !Array.isArray(parsed)) {
        all = parsed;
      }
    } catch {
      /* keep {} */
    }
  }
  all[yearMonth] = true;
  safeSetJson(getRewardCelebrationStorageKey(studentId), all);
}
