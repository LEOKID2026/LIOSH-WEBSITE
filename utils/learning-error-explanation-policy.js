/**
 * Policy for error-explanation answer visibility by game mode.
 * @typedef {{ mode?: string }} LearningErrorExplanationOpts
 */

/** @param {LearningErrorExplanationOpts} [opts] */
export function isLearningErrorExplanationMode(opts) {
  return opts?.mode === "learning";
}

/** @param {LearningErrorExplanationOpts} [opts] */
export function shouldIncludeAnswerInErrorExplanation(opts) {
  return isLearningErrorExplanationMode(opts);
}
