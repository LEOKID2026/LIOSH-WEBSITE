import { promoteAssignedActivityMathMcqChoices } from "./assigned-activity-math-mcq.js";
import { sanitizeStudentQuestionStem } from "../../utils/student-question-stem-sanitizer.js";

const STEM_FIELDS = [
  "stem",
  "question",
  "exerciseText",
  "questionLabel",
  "prompt",
  "title",
  "subtitle",
  "instruction",
  "hint",
  "feedback",
  "explanation",
  "caption",
  "questionText",
  "text",
  "body",
];

/**
 * Clean only student-visible text fields on a frozen activity question.
 * Does NOT reshuffle choices, change correctAnswer, or rewrite diagnostic metadata.
 *
 * @param {Record<string, unknown>} q
 * @returns {Record<string, unknown>}
 */
export function sanitizeAssignedActivityQuestionStemFields(q) {
  if (!q || typeof q !== "object") return q;
  const next = { ...q };
  for (const key of STEM_FIELDS) {
    if (typeof next[key] === "string") {
      next[key] = sanitizeStudentQuestionStem(next[key]);
    }
  }
  return next;
}

/**
 * Prepare a frozen activity question_set for student display.
 * Shared by parent / class / student scopes — same pipeline.
 * Does not mutate DB; does not change answer matching.
 *
 * @param {unknown} questionSet
 * @returns {Record<string, unknown>[]}
 */
export function prepareAssignedActivityQuestionSetForStudentDisplay(questionSet) {
  if (!Array.isArray(questionSet)) return [];
  return questionSet.map((raw) => {
    const q =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? /** @type {Record<string, unknown>} */ (raw)
        : {};
    const promoted = promoteAssignedActivityMathMcqChoices(q) || q;
    return sanitizeAssignedActivityQuestionStemFields(promoted);
  });
}
