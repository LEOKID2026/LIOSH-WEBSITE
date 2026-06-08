/** Shared learning wrong-answer feedback timing (all 6 subject masters). */

export const LEARNING_WRONG_ANSWER_FEEDBACK_MS = 7000;

export const LEARNING_CORRECT_ANSWER_ADVANCE_MS = 1000;

/** @deprecated use LEARNING_WRONG_ANSWER_FEEDBACK_MS */
export const MATH_WRONG_ANSWER_FEEDBACK_MS = LEARNING_WRONG_ANSWER_FEEDBACK_MS;

/** @deprecated use LEARNING_CORRECT_ANSWER_ADVANCE_MS */
export const MATH_CORRECT_ANSWER_ADVANCE_MS = LEARNING_CORRECT_ANSWER_ADVANCE_MS;

/**
 * @param {{ showSolution?: boolean, showPreviousSolution?: boolean }} state
 */
export function shouldPauseWrongAnswerAutoAdvance(state) {
  return Boolean(state?.showSolution || state?.showPreviousSolution);
}
