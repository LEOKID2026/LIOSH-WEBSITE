/**
 * Client-safe learning profile row shape (no Supabase). Shared by student UI, parent overlays, and APIs.
 */

export const LEARNING_PROFILE_SUBJECT_KEYS = [
  "math",
  "geometry",
  "hebrew",
  "english",
  "science",
  "moledet_geography",
  "history",
];

/**
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

export function emptyLearningProfileRow() {
  return {
    subjects: {},
    monthly: {},
    challenges: {},
    streaks: {},
    achievements: {},
    profile: {},
  };
}

/**
 * @param {unknown} row
 */
export function normalizeLearningProfileRow(row) {
  const r = isPlainObject(row) ? row : {};
  return {
    subjects: isPlainObject(r.subjects) ? r.subjects : {},
    monthly: isPlainObject(r.monthly) ? r.monthly : {},
    challenges: isPlainObject(r.challenges) ? r.challenges : {},
    streaks: isPlainObject(r.streaks) ? r.streaks : {},
    achievements: isPlainObject(r.achievements) ? r.achievements : {},
    profile: isPlainObject(r.profile) ? r.profile : {},
  };
}
