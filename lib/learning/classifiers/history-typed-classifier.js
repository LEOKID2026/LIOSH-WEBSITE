/**
 * Deterministic History typed-answer classifier.
 * Delegates to fuzzy-tolerance-history exact TEPs + structural tier.
 */

import { classifyHistoryAnswer } from "../fuzzy-tolerance-history.js";

/**
 * @param {unknown} userAnswer
 * @param {unknown} expectedAnswer
 * @param {Record<string, unknown>|null|undefined} params
 */
export function classifyHistoryTypedAnswer(userAnswer, expectedAnswer, params) {
  return classifyHistoryAnswer({
    ...(params && typeof params === "object" ? params : {}),
    userAnswer,
    expectedAnswer,
  });
}
