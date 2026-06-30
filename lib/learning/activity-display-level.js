/**
 * Phase 5 — parent/teacher activity displayLevel read/write (SSOT wrapper).
 * Uses lib/learning/display-level.js — no duplicate mapping.
 */

import {
  activityDbEnumToDisplayLevel,
  displayLevelLabelHe,
  displayLevelToActivityDbEnum,
  isScienceSubjectId,
  normalizeDisplayLevel,
  normalizeSubjectIdForDisplayLevel,
  resolveSessionLevels,
} from "./display-level.js";

export const ACTIVITY_FORBIDDEN_UI_LABELS = Object.freeze([
  "קל",
  "בינוני",
  "קשה",
  "מעורב",
]);

/** @typedef {"regular"|"advanced"} ActivityDisplayLevel */

/**
 * @param {string|null|undefined} subjectId
 * @returns {ActivityDisplayLevel[]}
 */
export function activityDisplayLevelKeys(subjectId) {
  if (isScienceSubjectId(subjectId)) return ["regular"];
  return ["regular", "advanced"];
}

/**
 * @param {ActivityDisplayLevel|string|null|undefined} displayLevel
 * @returns {string}
 */
export function activityDisplayLevelLabelHe(displayLevel) {
  return displayLevelLabelHe(displayLevel) || "";
}

/**
 * UI write path: displayLevel → DB difficulty_level enum (no schema change).
 * @param {ActivityDisplayLevel|string|null|undefined} displayLevel
 * @param {string|null|undefined} subjectId
 * @returns {"mixed"|"hard"}
 */
export function writeActivityDifficultyFromDisplayLevel(displayLevel, subjectId) {
  if (isScienceSubjectId(subjectId)) {
    return displayLevelToActivityDbEnum("regular") || "mixed";
  }
  const dl = normalizeDisplayLevel(displayLevel) || "regular";
  return displayLevelToActivityDbEnum(dl) || "mixed";
}

/**
 * Read path: stored DB enum → display level for UI / monitoring.
 * Science always regular; legacy hard stays internal only.
 *
 * @param {string|null|undefined} dbDifficulty
 * @param {string|null|undefined} subjectId
 * @returns {ActivityDisplayLevel}
 */
export function readActivityDisplayLevelFromDb(dbDifficulty, subjectId) {
  if (isScienceSubjectId(subjectId)) return "regular";
  return activityDbEnumToDisplayLevel(dbDifficulty) || "regular";
}

/**
 * Hebrew label for activity monitoring / export (רגיל / מתקדם only).
 * @param {string|null|undefined} dbDifficulty
 * @param {string|null|undefined} subjectId
 */
export function activityDbDifficultyLabelHe(dbDifficulty, subjectId) {
  const dl = readActivityDisplayLevelFromDb(dbDifficulty, subjectId);
  return activityDisplayLevelLabelHe(dl);
}

/**
 * Activity-level play metadata for student session (from activity row).
 * @param {Record<string, unknown>|null|undefined} row
 * @param {string|null|undefined} [subjectId]
 */
export function buildAssignedActivityPlayLevelFields(row, subjectId) {
  const subject =
    normalizeSubjectIdForDisplayLevel(subjectId) ||
    normalizeSubjectIdForDisplayLevel(row?.subject != null ? String(row.subject) : null);
  const dbDiff = String(row?.difficulty_level ?? row?.difficultyLevel ?? "mixed")
    .trim()
    .toLowerCase();

  const resolved = resolveSessionLevels({
    subjectId: subject,
    level: dbDiff,
    displayLevel: readActivityDisplayLevelFromDb(dbDiff, subject),
  });

  /** @type {Record<string, unknown>} */
  const out = {
    displayLevel: resolved.displayLevel,
    difficultyLevel: dbDiff,
  };
  if (resolved.sourceDifficulty) out.sourceDifficulty = resolved.sourceDifficulty;
  if (resolved.regularInternalState) out.regularInternalState = resolved.regularInternalState;
  if (resolved.scienceInternalState) out.scienceInternalState = resolved.scienceInternalState;
  return out;
}

/**
 * Restore per-question play level fields stripped for student delivery.
 *
 * @param {Record<string, unknown>} question
 * @param {Record<string, unknown>} [rawQuestion]
 * @param {{ subject?: string|null, difficultyLevel?: string|null }} [activityMeta]
 */
export function enrichActivityQuestionLevelFieldsForPlay(question, rawQuestion = {}, activityMeta = {}) {
  const q = question && typeof question === "object" ? { ...question } : {};
  const raw =
    rawQuestion && typeof rawQuestion === "object" && !Array.isArray(rawQuestion)
      ? rawQuestion
      : {};
  const subject =
    normalizeSubjectIdForDisplayLevel(q.subject != null ? String(q.subject) : null) ||
    normalizeSubjectIdForDisplayLevel(raw.subject != null ? String(raw.subject) : null) ||
    normalizeSubjectIdForDisplayLevel(activityMeta.subject);

  const perQuestionSource =
    (q.sourceDifficulty != null ? String(q.sourceDifficulty) : null) ||
    (raw.sourceDifficulty != null ? String(raw.sourceDifficulty) : null) ||
    (q.difficulty != null ? String(q.difficulty) : null) ||
    (raw.difficulty != null ? String(raw.difficulty) : null) ||
    null;

  const perQuestionDisplay =
    normalizeDisplayLevel(q.displayLevel) ||
    normalizeDisplayLevel(raw.displayLevel) ||
    null;

  const dbDiff = activityMeta.difficultyLevel != null ? String(activityMeta.difficultyLevel) : "mixed";

  const resolved = resolveSessionLevels({
    subjectId: subject,
    level: dbDiff,
    displayLevel: perQuestionDisplay || readActivityDisplayLevelFromDb(dbDiff, subject),
    sourceDifficulty: perQuestionSource || undefined,
    regularInternalState:
      q.regularInternalState ?? raw.regularInternalState ?? undefined,
    scienceInternalState:
      q.scienceInternalState ?? raw.scienceInternalState ?? undefined,
  });

  const sourceDifficulty =
    resolved.sourceDifficulty ||
    (perQuestionSource === "easy" ||
    perQuestionSource === "medium" ||
    perQuestionSource === "hard"
      ? perQuestionSource
      : "easy");

  q.displayLevel = resolved.displayLevel;
  q.sourceDifficulty = sourceDifficulty;
  q.difficulty = sourceDifficulty;

  if (resolved.regularInternalState) {
    q.regularInternalState = resolved.regularInternalState;
  }
  if (resolved.scienceInternalState) {
    q.scienceInternalState = resolved.scienceInternalState;
  }

  return q;
}
