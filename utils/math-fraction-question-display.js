/**
 * Shared fractions-topic question stem helpers (math-master + assigned activity).
 * Display-only — does not mutate stored question data or grading.
 */

/**
 * Generator answer blank (BLANK="__") appended to many stems.
 * Looks like a short black underline under the question; redundant on MCQ.
 *
 * @param {unknown} text
 * @returns {string}
 */
export function stripRedundantTrailingAnswerBlank(text) {
  let t = String(text ?? "");
  if (!t) return t;
  // Keep "=" on equation stems: "3/4 + 1/8 = __" → "3/4 + 1/8 ="
  t = t.replace(/\s*=\s*_{2,}\s*$/u, " =");
  // ": __" / trailing blank only
  t = t.replace(/\s*_{2,}\s*$/u, "");
  return t.replace(/\s{2,}/g, " ").replace(/\s+$/u, "");
}

/**
 * Fractions-topic question stem only — !important beats verbal inline fontSize.
 * Same mobile/desktop sizes on math-master and assigned-activity play.
 */
export const MATH_FRACTIONS_QUESTION_STEM_SIZE_CLASS =
  " !text-[2.35rem] md:!text-[3rem]";

/**
 * @param {Record<string, unknown>|null|undefined} question
 * @returns {boolean}
 */
export function isMathFractionsQuestionStem(question) {
  if (!question || typeof question !== "object") return false;
  const subject = String(question.subject || "").trim().toLowerCase();
  if (subject && subject !== "math") return false;
  const op = String(
    question.operation || question.topic || ""
  )
    .trim()
    .toLowerCase();
  return op === "fractions" || op.includes("fraction") || op.includes("שבר");
}

/**
 * Hide trailing BLANK only when the learner answers via MCQ choices (not open typing).
 *
 * @param {Record<string, unknown>|null|undefined} question
 * @param {{ usesChoiceUi?: boolean }} [opts]
 * @returns {boolean}
 */
export function shouldHideFractionsMcqTrailingBlank(question, opts = {}) {
  if (!isMathFractionsQuestionStem(question)) return false;
  if (opts.usesChoiceUi === true) return true;
  const choices = question?.choices ?? question?.answers ?? question?.options;
  return Array.isArray(choices) && choices.length >= 2;
}
