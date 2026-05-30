/**
 * Pure resume helpers for student assigned activities (all scopes).
 */

/**
 * @param {Array<{ question_index?: number, selected_answer?: unknown, is_correct?: boolean|null }>|null|undefined} rows
 */
export function mapAttemptRowsForStudentResume(rows) {
  return (rows || [])
    .filter((row) => Number.isFinite(row?.question_index))
    .map((row) => ({
      questionIndex: row.question_index,
      selectedAnswer:
        row.selected_answer != null ? String(row.selected_answer) : null,
      isCorrect: row.is_correct ?? null,
    }))
    .sort((a, b) => a.questionIndex - b.questionIndex);
}

/**
 * First unanswered question index, or last question when all are answered.
 *
 * @param {Array<{ questionIndex: number, isCorrect?: boolean|null }>|null|undefined} attempts
 * @param {number} questionCount
 */
export function computeResumeQuestionIndex(attempts, questionCount) {
  const count = Math.floor(Number(questionCount));
  if (!Number.isFinite(count) || count <= 0) return 0;

  const answered = new Set(
    (attempts || [])
      .filter((a) => Number.isFinite(a.questionIndex) && a.isCorrect != null)
      .map((a) => a.questionIndex)
  );

  for (let i = 0; i < count; i += 1) {
    if (!answered.has(i)) return i;
  }

  return count - 1;
}

/**
 * @param {Array<{ question_index?: number, selected_answer?: unknown, is_correct?: boolean|null }>|null|undefined} rows
 * @param {number} questionCount
 */
export function buildStudentActivityResumePayload(rows, questionCount) {
  const attempts = mapAttemptRowsForStudentResume(rows);
  return {
    attempts,
    resumeQuestionIndex: computeResumeQuestionIndex(attempts, questionCount),
  };
}
