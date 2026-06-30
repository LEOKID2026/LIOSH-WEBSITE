/**
 * Internal adaptive state for science (displayLevel always regular).
 * Pure functions — no React dependency.
 */

import {
  ADAPTIVE_ADVANCE_STREAK,
  ADAPTIVE_DROP_STREAK,
  NO_ADAPTIVE_MODES,
} from "./regular-internal-adaptive.js";

export {
  ADAPTIVE_ADVANCE_STREAK,
  ADAPTIVE_DROP_STREAK,
  NO_ADAPTIVE_MODES,
};

export const SCIENCE_INTERNAL_ORDER = Object.freeze(["easy", "medium", "hard"]);
export const SCIENCE_ADAPTIVE_START_STATE = "easy";
export const SCIENCE_DISPLAY_LEVEL = "regular";

/**
 * @typedef {Object} ScienceAdaptiveState
 * @property {ScienceInternalState} internalState
 * @property {number} correctStreak
 * @property {number} wrongStreak
 */

/**
 * @typedef {Object} ScienceAdaptiveContext
 * @property {string|null|undefined} [mode]
 * @property {boolean} [assignedDifficultyFixed]
 */

/**
 * Science never exposes advanced displayLevel.
 * @returns {false}
 */
export function isScienceAdvancedAllowed() {
  return false;
}

/**
 * @returns {"regular"}
 */
export function getScienceDisplayLevel() {
  return SCIENCE_DISPLAY_LEVEL;
}

/**
 * @param {Partial<ScienceAdaptiveState>} [overrides]
 * @returns {ScienceAdaptiveState}
 */
export function createScienceAdaptiveState(overrides = {}) {
  const allowed = SCIENCE_INTERNAL_ORDER.includes(overrides.internalState)
    ? overrides.internalState
    : SCIENCE_ADAPTIVE_START_STATE;
  return {
    internalState: allowed,
    correctStreak: Number.isFinite(overrides.correctStreak) ? overrides.correctStreak : 0,
    wrongStreak: Number.isFinite(overrides.wrongStreak) ? overrides.wrongStreak : 0,
  };
}

/**
 * @param {ScienceInternalState|string} current
 * @param {number} delta
 * @returns {ScienceInternalState}
 */
export function stepScienceInternalState(current, delta) {
  const idx = SCIENCE_INTERNAL_ORDER.indexOf(current);
  const base = idx >= 0 ? idx : 0;
  const next = Math.max(0, Math.min(SCIENCE_INTERNAL_ORDER.length - 1, base + delta));
  return SCIENCE_INTERNAL_ORDER[next];
}

/**
 * @param {ScienceAdaptiveContext} [context]
 * @returns {boolean}
 */
export function isScienceAdaptiveActive(context = {}) {
  if (context.assignedDifficultyFixed) return false;
  const mode = String(context.mode || "").trim().toLowerCase();
  if (mode && NO_ADAPTIVE_MODES.includes(mode)) return false;
  return true;
}

/**
 * @param {ScienceAdaptiveState} state
 * @param {boolean} isCorrect
 * @param {ScienceAdaptiveContext} [context]
 * @returns {ScienceAdaptiveState}
 */
export function applyScienceAdaptiveAnswer(state, isCorrect, context = {}) {
  if (!isScienceAdaptiveActive(context)) {
    return { ...state };
  }

  const next = { ...state };

  if (isCorrect) {
    next.wrongStreak = 0;
    next.correctStreak += 1;
    if (next.correctStreak >= ADAPTIVE_ADVANCE_STREAK) {
      next.correctStreak = 0;
      next.internalState = stepScienceInternalState(next.internalState, 1);
    }
  } else {
    next.correctStreak = 0;
    next.wrongStreak += 1;
    if (next.wrongStreak >= ADAPTIVE_DROP_STREAK) {
      next.wrongStreak = 0;
      next.internalState = stepScienceInternalState(next.internalState, -1);
    }
  }

  return next;
}
