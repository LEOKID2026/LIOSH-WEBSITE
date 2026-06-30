/**
 * Phase 4 — student self-practice displayLevel wiring (client-side).
 * Uses SSOT from lib/learning/display-level.js + adaptive modules.
 */

import {
  displayLevelLabelHe,
  isScienceSubjectId,
  normalizeDisplayLevel,
  normalizeLegacyLevelToDisplayLevel,
  resolveSessionLevels,
} from "../learning/display-level.js";
import {
  applyRegularAdaptiveAnswer,
  createRegularAdaptiveState,
  isRegularAdaptiveActive,
} from "../learning/regular-internal-adaptive.js";
import {
  applyScienceAdaptiveAnswer,
  createScienceAdaptiveState,
  getScienceDisplayLevel,
  isScienceAdaptiveActive,
} from "../learning/science-internal-adaptive.js";
import { mapPlannerTargetDifficultyToTriLevel } from "./adaptive-planner-recommended-practice.js";

export { displayLevelLabelHe, getScienceDisplayLevel };

/**
 * @param {string|null|undefined} subjectId
 * @returns {Array<"regular"|"advanced">}
 */
export function studentDisplayLevelKeys(subjectId) {
  if (isScienceSubjectId(subjectId)) return ["regular"];
  return ["regular", "advanced"];
}

/**
 * @param {string|null|undefined} subjectId
 * @returns {boolean}
 */
export function studentShowsDisplayLevelSelect(subjectId) {
  return studentDisplayLevelKeys(subjectId).length > 1;
}

/**
 * @param {"regular"|"advanced"|string} displayLevel
 * @returns {string}
 */
export function studentDisplayLevelLabel(displayLevel) {
  return displayLevelLabelHe(displayLevel) || String(displayLevel || "");
}

/**
 * @param {string|null|undefined} legacyKey easy|medium|hard|mixed|regular|advanced
 * @param {string|null|undefined} subjectId
 * @returns {"regular"|"advanced"}
 */
export function migrateLegacyPracticeKeyToDisplayLevel(legacyKey, subjectId) {
  if (isScienceSubjectId(subjectId)) return "regular";
  const fromDisplay = normalizeDisplayLevel(legacyKey);
  if (fromDisplay) return fromDisplay;
  const fromLegacy = normalizeLegacyLevelToDisplayLevel(legacyKey);
  return fromLegacy || "regular";
}

/**
 * @param {string|null|undefined} legacyKey
 * @param {string|null|undefined} subjectId
 * @returns {"easy"|"medium"|"hard"}
 */
export function migrateLegacyPracticeKeyToSourceDifficulty(legacyKey, subjectId) {
  const resolved = resolveSessionLevels({ subjectId, level: legacyKey, displayLevel: legacyKey });
  if (resolved.sourceDifficulty) return resolved.sourceDifficulty;
  if (resolved.scienceInternalState) return resolved.scienceInternalState;
  if (resolved.regularInternalState) return resolved.regularInternalState;
  return "easy";
}

/**
 * @param {string|null|undefined} subjectId
 * @param {"regular"|"advanced"|string} displayLevel
 * @param {{ internalState?: string }|null|undefined} adaptiveState
 * @returns {"easy"|"medium"|"hard"}
 */
export function resolveSourceDifficultyForPractice(subjectId, displayLevel, adaptiveState) {
  if (isScienceSubjectId(subjectId)) {
    const st = adaptiveState?.internalState;
    if (st === "easy" || st === "medium" || st === "hard") return st;
    return "easy";
  }
  if (normalizeDisplayLevel(displayLevel) === "advanced") return "hard";
  const st = adaptiveState?.internalState;
  if (st === "easy" || st === "medium") return st;
  return "easy";
}

/**
 * @param {string|null|undefined} subjectId
 * @returns {import("../learning/regular-internal-adaptive.js").RegularAdaptiveState|import("../learning/science-internal-adaptive.js").ScienceAdaptiveState}
 */
export function createStudentAdaptiveState(subjectId, overrides = {}) {
  if (isScienceSubjectId(subjectId)) return createScienceAdaptiveState(overrides);
  return createRegularAdaptiveState(overrides);
}

/**
 * @param {string|null|undefined} subjectId
 * @param {object} state
 * @param {boolean} isCorrect
 * @param {{ mode?: string, assignedDifficultyFixed?: boolean, displayLevel?: string }} [context]
 */
export function applyStudentAdaptiveAnswer(subjectId, state, isCorrect, context = {}) {
  if (isScienceSubjectId(subjectId)) {
    return applyScienceAdaptiveAnswer(state, isCorrect, context);
  }
  if (normalizeDisplayLevel(context.displayLevel) === "advanced") {
    return { ...state };
  }
  return applyRegularAdaptiveAnswer(state, isCorrect, context);
}

/**
 * @param {string|null|undefined} subjectId
 * @param {{ mode?: string, assignedDifficultyFixed?: boolean, displayLevel?: string }} [context]
 */
export function isStudentAdaptiveActive(subjectId, context = {}) {
  if (isScienceSubjectId(subjectId)) return isScienceAdaptiveActive(context);
  if (normalizeDisplayLevel(context.displayLevel) === "advanced") return false;
  return isRegularAdaptiveActive(context);
}

/**
 * @param {string|null|undefined} subjectId
 * @param {"regular"|"advanced"|string} displayLevel
 * @param {{ internalState?: string }|null|undefined} adaptiveState
 */
export function buildStudentSessionStartLevelFields(subjectId, displayLevel, adaptiveState) {
  const dl = isScienceSubjectId(subjectId) ? "regular" : normalizeDisplayLevel(displayLevel) || "regular";
  const sd = resolveSourceDifficultyForPractice(subjectId, dl, adaptiveState);
  /** @type {Record<string, string>} */
  const out = {
    displayLevel: dl,
    level: sd,
    sourceDifficulty: sd,
  };
  if (isScienceSubjectId(subjectId)) {
    out.scienceInternalState = sd;
  } else if (dl === "regular") {
    out.regularInternalState = sd === "medium" ? "medium" : "easy";
  }
  return out;
}

/**
 * @param {string|null|undefined} subjectId
 * @param {"regular"|"advanced"|string} displayLevel
 * @param {"easy"|"medium"|"hard"|string} sourceDifficulty
 * @param {{ internalState?: string }|null|undefined} adaptiveState
 */
export function buildStudentAnswerLevelFields(subjectId, displayLevel, sourceDifficulty, adaptiveState) {
  const dl = isScienceSubjectId(subjectId) ? "regular" : normalizeDisplayLevel(displayLevel) || "regular";
  const sd =
    sourceDifficulty === "easy" || sourceDifficulty === "medium" || sourceDifficulty === "hard"
      ? sourceDifficulty
      : resolveSourceDifficultyForPractice(subjectId, dl, adaptiveState);
  /** @type {Record<string, string>} */
  const out = {
    displayLevel: dl,
    sourceDifficulty: sd,
    level: sd,
  };
  if (isScienceSubjectId(subjectId)) {
    out.scienceInternalState = sd;
  } else if (dl === "regular") {
    out.regularInternalState = sd === "medium" ? "medium" : "easy";
  }
  return out;
}

/**
 * @param {Record<string, unknown>|null|undefined} question
 * @param {"regular"|"advanced"|string} displayLevel
 * @param {"easy"|"medium"|"hard"|string} sourceDifficulty
 */
export function tagQuestionWithLevelFields(question, displayLevel, sourceDifficulty) {
  if (!question || typeof question !== "object") return question;
  return {
    ...question,
    displayLevel: isScienceSubjectId(question.subject) ? "regular" : displayLevel,
    sourceDifficulty,
    difficulty: sourceDifficulty,
  };
}

/**
 * Migrate book resume / legacy snapshot level fields.
 * @param {Record<string, unknown>|null|undefined} snap
 * @param {string|null|undefined} subjectId
 */
export function migratePracticeResumeSnapshot(snap, subjectId) {
  if (!snap || typeof snap !== "object") return snap;
  const legacy = snap.displayLevel ?? snap.level;
  const displayLevel = migrateLegacyPracticeKeyToDisplayLevel(String(legacy || ""), subjectId);
  const sourceDifficulty = migrateLegacyPracticeKeyToSourceDifficulty(String(snap.level || legacy || ""), subjectId);
  const adaptiveSeed = isScienceSubjectId(subjectId)
    ? { internalState: sourceDifficulty }
    : { internalState: sourceDifficulty === "hard" ? "easy" : sourceDifficulty === "medium" ? "medium" : "easy" };
  return {
    ...snap,
    displayLevel,
    level: sourceDifficulty,
    sourceDifficulty,
    adaptiveState: createStudentAdaptiveState(subjectId, adaptiveSeed),
  };
}

/**
 * @param {unknown} raw planner targetDifficulty
 * @param {string|null|undefined} subjectId
 * @returns {"regular"|"advanced"|null}
 */
export function mapPlannerTargetToDisplayLevel(raw, subjectId) {
  if (isScienceSubjectId(subjectId)) return "regular";
  const tri = mapPlannerTargetDifficultyToTriLevel(raw);
  if (!tri) {
    const dl = normalizeDisplayLevel(raw);
    return dl || null;
  }
  if (tri === "hard") return "advanced";
  return "regular";
}

/**
 * @param {unknown} raw
 * @returns {"easy"|"medium"|"hard"|null}
 */
export function mapPlannerTargetToSourceDifficulty(raw) {
  return mapPlannerTargetDifficultyToTriLevel(raw);
}
