/**
 * Internal adaptive state for regular displayLevel (non-science subjects).
 * Pure functions — no React dependency.
 */

/** @typedef {"easy"|"medium"} RegularInternalState */

export const REGULAR_INTERNAL_ORDER = Object.freeze(["easy", "medium"]);
export const REGULAR_ADAPTIVE_START_STATE = "easy";
export const ADAPTIVE_ADVANCE_STREAK = 3;
export const ADAPTIVE_DROP_STREAK = 2;

/** Modes where internal adaptive stepping is disabled (per plan). */
export const NO_ADAPTIVE_MODES = Object.freeze(["mistakes", "graded"]);

/**
 * @typedef {Object} RegularAdaptiveState
 * @property {RegularInternalState} internalState
 * @property {number} correctStreak
 * @property {number} wrongStreak
 */

/**
 * @typedef {Object} RegularAdaptiveContext
 * @property {string|null|undefined} [mode]
 * @property {boolean} [assignedDifficultyFixed]
 */

/**
 * @param {Partial<RegularAdaptiveState>} [overrides]
 * @returns {RegularAdaptiveState}
 */
export function createRegularAdaptiveState(overrides = {}) {
  const internalState =
    overrides.internalState === "medium" ? "medium" : REGULAR_ADAPTIVE_START_STATE;
  return {
    internalState,
    correctStreak: Number.isFinite(overrides.correctStreak) ? overrides.correctStreak : 0,
    wrongStreak: Number.isFinite(overrides.wrongStreak) ? overrides.wrongStreak : 0,
  };
}

/**
 * @param {RegularInternalState|string} current
 * @param {number} delta
 * @returns {RegularInternalState}
 */
export function stepRegularInternalState(current, delta) {
  const idx = REGULAR_INTERNAL_ORDER.indexOf(current);
  const base = idx >= 0 ? idx : 0;
  const next = Math.max(0, Math.min(REGULAR_INTERNAL_ORDER.length - 1, base + delta));
  return REGULAR_INTERNAL_ORDER[next];
}

/**
 * @param {RegularAdaptiveContext} [context]
 * @returns {boolean}
 */
export function isRegularAdaptiveActive(context = {}) {
  if (context.assignedDifficultyFixed) return false;
  const mode = String(context.mode || "").trim().toLowerCase();
  if (mode && NO_ADAPTIVE_MODES.includes(mode)) return false;
  return true;
}

/**
 * @param {RegularAdaptiveState} state
 * @param {boolean} isCorrect
 * @param {RegularAdaptiveContext} [context]
 * @returns {RegularAdaptiveState}
 */
export function applyRegularAdaptiveAnswer(state, isCorrect, context = {}) {
  if (!isRegularAdaptiveActive(context)) {
    return { ...state };
  }

  const next = { ...state };

  if (isCorrect) {
    next.wrongStreak = 0;
    next.correctStreak += 1;
    if (next.correctStreak >= ADAPTIVE_ADVANCE_STREAK) {
      next.correctStreak = 0;
      next.internalState = stepRegularInternalState(next.internalState, 1);
    }
  } else {
    next.correctStreak = 0;
    next.wrongStreak += 1;
    if (next.wrongStreak >= ADAPTIVE_DROP_STREAK) {
      next.wrongStreak = 0;
      next.internalState = stepRegularInternalState(next.internalState, -1);
    }
  }

  return next;
}
