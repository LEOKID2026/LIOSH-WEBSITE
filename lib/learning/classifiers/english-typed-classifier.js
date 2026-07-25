/**
 * Deterministic English typed-answer classifier.
 * Delegates to fuzzy-tolerance-english exact TEPs + structural spelling tier.
 */

import { classifyEnglishAnswer } from "../fuzzy-tolerance-english.js";

/**
 * @param {unknown} userAnswer
 * @param {unknown} expectedAnswer
 * @param {Record<string, unknown>|null|undefined} params
 */
export function classifyEnglishTypedAnswer(userAnswer, expectedAnswer, params) {
  return classifyEnglishAnswer({
    ...(params && typeof params === "object" ? params : {}),
    userAnswer,
    expectedAnswer,
  });
}
