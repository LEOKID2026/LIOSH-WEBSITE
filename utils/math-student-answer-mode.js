/**
 * Resolve the live math-master answer UI mode (typed vs choice).
 * Mirrors pages/learning/math-master.js answer-surface branching.
 * Worksheet / print paths should not call this — they keep choices-based MCQ.
 *
 * Topic-3: fractions are NOT blanket-forced to choice. String answers with "/"
 * (or non-numeric correctAnswer) still select choice via content inspection.
 * Numeric unit-fraction answers (e.g. half-of-N) can be typed in learning/practice.
 */

/**
 * @param {unknown} ans
 * @returns {boolean}
 */
function answerLooksNonNumeric(ans) {
  if (typeof ans === "string") {
    return ans.includes("/") || ans.includes(" ") || Number.isNaN(parseFloat(ans));
  }
  return false;
}

/**
 * @param {Record<string, unknown>|null|undefined} question
 * @returns {boolean}
 */
export function mathQuestionNeedsChoiceButtons(question) {
  if (!question || typeof question !== "object") return false;
  const op = String(question.operation || "");
  // Topic-3: do not force all fractions → choice; content decides.
  if (
    op === "ratio" ||
    op === "scale" ||
    op === "compare" ||
    op === "factors_multiples" ||
    op === "division_with_remainder"
  ) {
    return true;
  }
  // Fraction compare kinds always present as choice of fraction strings.
  const kind = String(
    (question.params && typeof question.params === "object" ? question.params.kind : "") ||
      question.kind ||
      "",
  );
  if (kind.includes("frac_compare") || kind.includes("compare_like_den")) {
    return true;
  }
  if (Array.isArray(question.answers) && question.answers.some(answerLooksNonNumeric)) {
    return true;
  }
  const correct = question.correctAnswer;
  if (typeof correct === "string") {
    return correct.includes("/") || correct.includes(" ") || Number.isNaN(parseFloat(correct));
  }
  return false;
}

/**
 * @param {{
 *   mode?: string|null,
 *   practiceMode?: boolean|null,
 *   question?: Record<string, unknown>|null,
 * }} ctx
 * @returns {"typed"|"choice"}
 */
export function resolveMathStudentAnswerMode(ctx = {}) {
  const mode = String(ctx.mode || "");
  const practiceMode = ctx.practiceMode === true;
  const needsChoice = mathQuestionNeedsChoiceButtons(ctx.question);
  const shouldShowChoiceButtons =
    mode === "challenge" || mode === "speed" || mode === "marathon" || needsChoice;

  if (shouldShowChoiceButtons) return "choice";
  if ((mode === "learning" || mode === "practice") && !practiceMode) return "typed";
  return "choice";
}
