/**
 * Phase 6 — parent report practice level read/display (SSOT wrapper).
 * Parent-facing: רגיל / מתקדם only. Internal sourceDifficulty stays in aggregate only.
 */

import {
  activityDbEnumToDisplayLevel,
  displayLevelLabelHe,
  isScienceSubjectId,
  normalizeDisplayLevel,
  normalizeLegacyLevelToDisplayLevel,
  normalizeSubjectIdForDisplayLevel,
} from "./display-level.js";

/** English/internal keys that must never appear in parent-visible report copy. */
export const PARENT_FORBIDDEN_INTERNAL_LEVEL_KEYS = Object.freeze([
  "easy",
  "medium",
  "hard",
  "mixed",
  "sourceDifficulty",
  "displayLevel",
  "regularInternalState",
  "scienceInternalState",
  "displayLevelKey",
  "_sourceDifficultyBreakdown",
]);

/** Legacy Hebrew practice-level labels forbidden in parent report UI. */
export const PARENT_FORBIDDEN_PRACTICE_LEVEL_HE = Object.freeze(["קל", "בינוני", "קשה"]);

/**
 * @param {string|null|undefined} rawLevel legacy or display key
 * @param {string|null|undefined} subjectId
 * @returns {"regular"|"advanced"}
 */
export function resolvePracticeDisplayLevelKey(rawLevel, subjectId) {
  if (isScienceSubjectId(subjectId)) return "regular";
  const fromDisplay = normalizeDisplayLevel(rawLevel);
  if (fromDisplay === "regular" || fromDisplay === "advanced") return fromDisplay;
  const fromLegacy =
    activityDbEnumToDisplayLevel(String(rawLevel || "").trim().toLowerCase()) ||
    normalizeLegacyLevelToDisplayLevel(rawLevel);
  return fromLegacy === "advanced" ? "advanced" : "regular";
}

/**
 * @param {string|null|undefined} rawLevel
 * @param {string|null|undefined} subjectId
 * @returns {string}
 */
export function formatPracticeLevelLabelForParent(rawLevel, subjectId) {
  const dl = resolvePracticeDisplayLevelKey(rawLevel, subjectId);
  return displayLevelLabelHe(dl) || "לא זמין";
}

/**
 * Share of medium sourceDifficulty within regular practice evidence.
 * @param {Record<string, unknown>|null|undefined} row
 */
export function regularMediumEvidenceShare(row) {
  const bd = row?._sourceDifficultyBreakdown;
  if (!bd || typeof bd !== "object") {
    const lk = String(row?.levelKey || "").toLowerCase();
    if (lk === "medium") return 0.65;
    if (lk === "easy") return 0;
    return 0;
  }
  const easy = Math.max(0, Math.floor(Number(bd.easy) || 0));
  const medium = Math.max(0, Math.floor(Number(bd.medium) || 0));
  const hard = Math.max(0, Math.floor(Number(bd.hard) || 0));
  const total = easy + medium + hard;
  if (total <= 0) return 0;
  return medium / total;
}

/**
 * @param {Record<string, unknown>|null|undefined} row
 * @param {number} [minShare=0.6]
 */
export function hasRegularMediumEvidence(row, minShare = 0.6) {
  return regularMediumEvidenceShare(row) >= minShare;
}

/**
 * @param {string|null|undefined} subjectId
 * @param {Record<string, unknown>|null|undefined} row
 * @returns {"regular"|"advanced"}
 */
export function resolveRowDisplayLevelKey(subjectId, row) {
  const subject = normalizeSubjectIdForDisplayLevel(subjectId);
  if (isScienceSubjectId(subject)) return "regular";
  const fromRow =
    normalizeDisplayLevel(row?.displayLevelKey) ||
    normalizeDisplayLevel(row?.displayLevel) ||
    normalizeDisplayLevel(row?.dominantDisplayLevel);
  if (fromRow) return fromRow;
  return resolvePracticeDisplayLevelKey(row?.levelKey, subject);
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function findForbiddenInternalLevelKeyLeaks(text) {
  const lower = String(text || "").toLowerCase();
  const hits = [];
  for (const key of PARENT_FORBIDDEN_INTERNAL_LEVEL_KEYS) {
    const re = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(lower)) hits.push(key);
  }
  return hits;
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function findForbiddenLegacyPracticeLevelHe(text) {
  const t = String(text || "");
  const hits = [];
  for (const term of PARENT_FORBIDDEN_PRACTICE_LEVEL_HE) {
    if (t.includes(term)) hits.push(term);
  }
  return hits;
}
