/**
 * Deterministic Hebrew typed-answer classifier.
 * Delegates to fuzzy-tolerance-hebrew exact TEPs + structural spelling tier.
 */

import { classifyHebrewAnswer } from "../fuzzy-tolerance-hebrew.js";

/**
 * @param {unknown} userAnswer
 * @param {unknown} expectedAnswer
 * @param {Record<string, unknown>|null|undefined} params
 */
export function classifyHebrewTypedAnswer(userAnswer, expectedAnswer, params) {
  return classifyHebrewAnswer({
    ...(params && typeof params === "object" ? params : {}),
    userAnswer,
    expectedAnswer,
  });
}
