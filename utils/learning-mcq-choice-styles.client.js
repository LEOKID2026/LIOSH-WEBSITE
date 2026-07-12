/**
 * Shared MCQ answer card styling for learning master pages.
 * Visual-only — does not change selection or grading logic.
 */

import { LEARNING_MASTER_MOBILE_ANSWER_SCALE_CLASS } from "./learning-master-mobile.client.js";

/** @param {boolean} isMobileViewport */
export function getLearningMcqAnswerCardSizeClass(isMobileViewport = false) {
  if (isMobileViewport) {
    return "text-[17px] leading-snug font-bold break-words overflow-wrap-anywhere px-3.5 py-4 min-h-[3.5rem] w-full h-full flex items-center justify-center text-center";
  }
  return "text-[20px] md:text-[21px] leading-snug font-bold break-words overflow-wrap-anywhere px-5 py-5 min-h-[5.25rem] md:min-h-[5.5rem] w-full h-full flex items-center justify-center text-center";
}

/**
 * Full-width MCQ grid — matches approved Hebrew mobile layout.
 * @param {{ useNarrowMobileAnswerFallback?: boolean }} [opts]
 */
export function buildLearningMcqGridClassName({
  useNarrowMobileAnswerFallback = false,
} = {}) {
  return [
    "grid gap-3 w-full mb-3 max-[420px]:gap-2 max-[420px]:mb-2",
    useNarrowMobileAnswerFallback
      ? "grid-cols-2 max-[420px]:grid-cols-1"
      : "grid-cols-2",
    LEARNING_MASTER_MOBILE_ANSWER_SCALE_CLASS,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * @param {{
 *   MB: {
 *     choiceDefault?: string,
 *     choiceSelected?: string,
 *     choiceCorrect?: string,
 *     choiceWrong?: string,
 *   },
 *   isSelected?: boolean,
 *   isCorrectChoice?: boolean,
 *   isWrong?: boolean,
 *   revealResults?: boolean,
 * }} input
 */
export function resolveLearningMcqChoiceClassName({
  MB,
  isSelected = false,
  isCorrectChoice = false,
  isWrong = false,
  revealResults = false,
}) {
  if (isCorrectChoice && isSelected) return MB.choiceCorrect || "";
  if (isWrong) return MB.choiceWrong || "";
  if (revealResults && isCorrectChoice) return MB.choiceCorrect || "";
  if (isSelected && !revealResults) {
    return MB.choiceSelected || MB.choiceDefault || "";
  }
  return MB.choiceDefault || "";
}
