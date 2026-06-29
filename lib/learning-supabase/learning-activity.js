import { normalizeMoledetGeographyActivitySubjectId } from "../learning-shared/moledet-geography-subject-id.js";
import { normalizeHistoryActivitySubjectId } from "../learning-shared/history-subject-id.js";

export const LEARNING_SUBJECT_ALLOWLIST = new Set([
  "math",
  "geometry",
  "english",
  "hebrew",
  "science",
  "moledet_geography",
  "history",
]);

const CLIENT_META_MAX_JSON_CHARS = 2000;

export function readJsonBody(req) {
  const body = req?.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  return body;
}

export function normalizeSubject(raw) {
  const subject = String(raw || "").trim().toLowerCase();
  const moledet = normalizeMoledetGeographyActivitySubjectId(subject);
  if (moledet) return moledet;
  const history = normalizeHistoryActivitySubjectId(subject);
  if (history) return history;
  if (!LEARNING_SUBJECT_ALLOWLIST.has(subject)) return null;
  return subject;
}

export function normalizeOptionalString(raw, maxLen = 1200) {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!value) return null;
  return value.length > maxLen ? value.slice(0, maxLen) : value;
}

export function normalizeOptionalInteger(raw, min = 0, max = 1000000000) {
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  const rounded = Math.floor(value);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

export function normalizeOptionalNumber(raw, min = 0, max = 1000000000) {
  if (raw == null || raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function normalizeClientMeta(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  try {
    const asJson = JSON.stringify(raw);
    if (asJson.length <= CLIENT_META_MAX_JSON_CHARS) {
      return JSON.parse(asJson);
    }
    return { truncated: true };
  } catch {
    return {};
  }
}

export function isMissingColumnError(error) {
  const message = String(error?.message || "");
  const details = String(error?.details || "");
  const hint = String(error?.hint || "");
  const full = `${message} ${details} ${hint}`.toLowerCase();
  return full.includes("column") && full.includes("does not exist");
}

export function mergeJsonObjects(base, patch) {
  const safeBase = base && typeof base === "object" && !Array.isArray(base) ? base : {};
  const safePatch = patch && typeof patch === "object" && !Array.isArray(patch) ? patch : {};
  return { ...safeBase, ...safePatch };
}

/**
 * Game / UI modes persisted on learning_sessions.metadata and used in parent reports.
 * Includes both free-practice modes (from learning masters) and assigned activity modes
 * (from classroom_activities, student_activities, parent_assigned_activities).
 */
const LEARNING_GAME_MODE_ALLOWLIST = new Set([
  // Free-practice modes
  "learning",
  "practice",
  "challenge",
  "speed",
  "marathon",
  "review",
  "drill",
  "graded",
  "practice_mistakes",
  "normal",
  "mistakes",
  // Assigned activity modes
  "quiz",
  "homework",
  "guided_practice",
  "live_lesson",
  "discussion",
  "worksheet",
  // Book mode
  "learning_book",
]);

/** Sorted list for report aggregation buckets (must match {@link normalizeLearningGameMode}). */
export const LEARNING_GAME_MODE_ENUM = Object.freeze(
  Array.from(LEARNING_GAME_MODE_ALLOWLIST).sort((a, b) => a.localeCompare(b))
);

/**
 * @param {unknown} raw
 * @returns {string|null} Lowercase mode or null if invalid / empty
 */
export function normalizeLearningGameMode(raw) {
  if (raw == null) return null;
  const v = String(raw).trim().toLowerCase();
  if (!v) return null;
  return LEARNING_GAME_MODE_ALLOWLIST.has(v) ? v : null;
}
