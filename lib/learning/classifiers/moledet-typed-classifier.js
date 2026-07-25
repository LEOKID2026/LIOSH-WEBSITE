/**
 * Deterministic Moledet / geography / homeland typed-answer classifier.
 * Delegates to fuzzy-tolerance-moledet exact TEPs + structural tier.
 */

import { classifyMoledetAnswer } from "../fuzzy-tolerance-moledet.js";

/**
 * @param {unknown} userAnswer
 * @param {unknown} expectedAnswer
 * @param {Record<string, unknown>|null|undefined} params
 */
export function classifyMoledetTypedAnswer(userAnswer, expectedAnswer, params) {
  return classifyMoledetAnswer({
    ...(params && typeof params === "object" ? params : {}),
    userAnswer,
    expectedAnswer,
  });
}

export const classifyGeographyTypedAnswer = classifyMoledetTypedAnswer;
export const classifyHomelandTypedAnswer = classifyMoledetTypedAnswer;
