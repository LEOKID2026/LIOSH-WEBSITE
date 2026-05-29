/**
 * Student-facing activity completion copy (no grades / percentages).
 */

/**
 * @param {unknown} correctCount
 * @param {unknown} questionCount
 */
export function formatStudentActivityCompletionSummaryHe(correctCount, questionCount) {
  const correct = Math.max(0, Number(correctCount) || 0);
  const total = Math.max(0, Number(questionCount) || 0);
  if (total <= 0) {
    return correct > 0 ? `ענית נכון על ${correct} שאלות` : "סיימת את הפעילות";
  }
  return `ענית נכון על ${correct} מתוך ${total} שאלות`;
}

/**
 * @param {unknown} correctCount
 * @param {unknown} questionCount
 */
export function formatStudentActivityCompletionSummaryShortHe(correctCount, questionCount) {
  const correct = Math.max(0, Number(correctCount) || 0);
  const total = Math.max(0, Number(questionCount) || 0);
  if (total <= 0) {
    return `${correct} שאלות`;
  }
  return `${correct}/${total} שאלות`;
}
