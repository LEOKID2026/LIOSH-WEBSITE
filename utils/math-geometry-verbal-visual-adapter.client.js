/**
 * Thin adapter for math / geometry: decides when to apply the approved verbal contract.
 * Does not duplicate colors or sizes — delegates to hebrew-approved-verbal-master-contract.
 */

import { resolveStudentQuestionDisplayParts } from "./student-question-display.js";
import {
  buildHebrewApprovedVerbalMasterLayout,
  getHebrewApprovedSingleVerbalQuestionStyle,
} from "./hebrew-approved-verbal-master-contract.client.js";

export { getHebrewApprovedSingleVerbalQuestionStyle };

/**
 * Pure verbal text stem (not vertical numeric layout, not equation/mixed).
 * @param {{
 *   question?: string,
 *   questionLabel?: string,
 *   exerciseText?: string,
 *   isVerticalDisplay?: boolean,
 *   canDisplayVertically?: boolean,
 * }} opts
 */
export function isApprovedVerbalTextStem({
  question,
  questionLabel,
  exerciseText,
  isVerticalDisplay = false,
  canDisplayVertically = false,
} = {}) {
  if (isVerticalDisplay && canDisplayVertically && exerciseText) {
    return false;
  }
  const parts = resolveStudentQuestionDisplayParts({
    question,
    questionLabel,
    exerciseText,
  });
  return parts.bodyKind === "text";
}

/**
 * @param {{
 *   MB: { questionLead: string, questionBody: string },
 *   question?: string,
 *   questionLabel?: string,
 *   exerciseText?: string,
 *   answers?: Array<unknown>,
 * }} input
 */
export function buildApprovedVerbalStemLayout({
  MB,
  question,
  questionLabel,
  exerciseText,
  answers = [],
}) {
  return buildHebrewApprovedVerbalMasterLayout({
    MB,
    questionParts: [question, questionLabel, exerciseText],
    answers,
  });
}
