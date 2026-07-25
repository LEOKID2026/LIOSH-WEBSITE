/**
 * Deterministic Science typed-answer classifier.
 * Delegates to fuzzy-tolerance-science exact TEPs + structural tier.
 */

import { classifyScienceAnswer } from "../fuzzy-tolerance-science.js";

/**
 * @param {unknown} userAnswer
 * @param {unknown} expectedAnswer
 * @param {Record<string, unknown>|null|undefined} params
 */
export function classifyScienceTypedAnswer(userAnswer, expectedAnswer, params) {
  return classifyScienceAnswer({
    ...(params && typeof params === "object" ? params : {}),
    userAnswer,
    expectedAnswer,
  });
}
