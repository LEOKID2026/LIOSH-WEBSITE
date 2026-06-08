/** Minimum time wrong-answer feedback / "למה הטעות קרתה?" stays visible (learning). */
export const MATH_WRONG_ANSWER_FEEDBACK_MS = 7000;

/** Correct-answer auto-advance (unchanged product behavior). */
export const MATH_CORRECT_ANSWER_ADVANCE_MS = 1000;

/**
 * @param {{ showSolution?: boolean, showPreviousSolution?: boolean }} state
 */
export function shouldPauseWrongAnswerAutoAdvance(state) {
  return Boolean(state?.showSolution || state?.showPreviousSolution);
}
