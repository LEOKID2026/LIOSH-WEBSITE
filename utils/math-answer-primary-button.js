/** Primary typed-answer action: one slot swaps בדוק ↔ שאלה הבאה. */

export const MATH_ANSWER_CHECK_LABEL = "בדוק";
export const MATH_ANSWER_NEXT_LABEL = "שאלה הבאה";

/**
 * @param {{ selectedAnswer: unknown, textAnswer: unknown }} p
 */
export function getMathPrimaryAnswerButtonState(p) {
  const answered = p.selectedAnswer != null && p.selectedAnswer !== "";
  const hasDraft = String(p.textAnswer ?? "").trim() !== "";
  if (answered) {
    return {
      label: MATH_ANSWER_NEXT_LABEL,
      action: "next",
      disabled: false,
    };
  }
  return {
    label: MATH_ANSWER_CHECK_LABEL,
    action: "check",
    disabled: !hasDraft,
  };
}
