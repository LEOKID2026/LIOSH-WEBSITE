/**
 * Practice visibility counts for parent reports.
 *
 * Separates "was this subject practiced?" from diagnostic evidence strength.
 * When diagnosticAnswers is explicitly 0, ?? fallbacks are wrong — use these helpers.
 */

function safeFloor(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

function usesDiagnosticEvidence(row = {}) {
  return safeFloor(row.diagnosticAnswers) > 0;
}

/** @param {Record<string, unknown>} row */
export function hasDiagnosticEvidence(row = {}) {
  return usesDiagnosticEvidence(row);
}

/**
 * @param {Record<string, unknown>} row
 */
export function effectivePracticeAnswerCount(row = {}) {
  const answers = safeFloor(row.answers);
  if (answers > 0) return answers;
  if (usesDiagnosticEvidence(row)) return safeFloor(row.diagnosticAnswers);
  const learning = safeFloor(row.learningAnswers);
  if (learning > 0) return learning;
  return safeFloor(row.total);
}

/**
 * @param {...Record<string, unknown>} rows
 */
export function effectivePracticeAnswerCountFromSources(...rows) {
  for (const row of rows) {
    const count = effectivePracticeAnswerCount(row || {});
    if (count > 0) return count;
  }
  return 0;
}

/**
 * @param {Record<string, unknown>} row
 */
export function effectivePracticeCorrectCount(row = {}) {
  if (safeFloor(row.answers) > 0) return safeFloor(row.correct);
  if (usesDiagnosticEvidence(row)) return safeFloor(row.diagnosticCorrect);
  return safeFloor(row.correct);
}

/**
 * @param {Record<string, unknown>} row
 */
export function effectivePracticeWrongCount(row = {}) {
  if (safeFloor(row.answers) > 0) return safeFloor(row.wrong);
  if (usesDiagnosticEvidence(row)) return safeFloor(row.diagnosticWrong);
  return safeFloor(row.wrong);
}

/**
 * @param {Record<string, unknown>} row
 */
export function effectivePracticeMetrics(row = {}) {
  return {
    answers: effectivePracticeAnswerCount(row),
    correct: effectivePracticeCorrectCount(row),
    wrong: effectivePracticeWrongCount(row),
  };
}

/**
 * @param {...Record<string, unknown>} rows
 */
export function effectivePracticeMetricsFromSources(...rows) {
  for (const row of rows) {
    const metrics = effectivePracticeMetrics(row || {});
    if (metrics.answers > 0) return metrics;
  }
  return { answers: 0, correct: 0, wrong: 0 };
}

/**
 * @param {Record<string, unknown>} row
 */
export function effectivePracticeAccuracy(row = {}) {
  if (safeFloor(row.answers) > 0) {
    const acc = Number(row.accuracy);
    if (Number.isFinite(acc)) return acc;
    const answers = safeFloor(row.answers);
    const correct = safeFloor(row.correct);
    return answers > 0 ? Number(((correct / answers) * 100).toFixed(2)) : 0;
  }
  if (usesDiagnosticEvidence(row)) {
    const acc = Number(row.diagnosticAccuracy);
    if (Number.isFinite(acc)) return acc;
  }
  const acc = Number(row.accuracy);
  return Number.isFinite(acc) ? acc : 0;
}

/**
 * Summary-level practice count (prefers totalAnswers over learningAnswers alone).
 * @param {Record<string, unknown>} summary
 */
export function effectivePracticeSummaryAnswerCount(summary = {}) {
  const total = safeFloor(summary.totalAnswers);
  if (total > 0) return total;
  const answers = safeFloor(summary.answers);
  if (answers > 0) return answers;
  if (usesDiagnosticEvidence(summary)) return safeFloor(summary.diagnosticAnswers);
  return safeFloor(summary.learningAnswers);
}

/**
 * @param {Record<string, unknown>} summary
 */
export function effectivePracticeSummaryCorrectCount(summary = {}) {
  if (safeFloor(summary.totalAnswers) > 0) return safeFloor(summary.correctAnswers);
  if (usesDiagnosticEvidence(summary)) return safeFloor(summary.diagnosticCorrect);
  return safeFloor(summary.correct);
}

/**
 * @param {Record<string, unknown>} summary
 */
export function effectivePracticeSummaryWrongCount(summary = {}) {
  if (safeFloor(summary.totalAnswers) > 0) return safeFloor(summary.wrongAnswers);
  if (usesDiagnosticEvidence(summary)) return safeFloor(summary.diagnosticWrong);
  return safeFloor(summary.wrong);
}

/**
 * @param {Record<string, unknown>} summary
 */
export function effectivePracticeSummaryAccuracy(summary = {}) {
  const total = safeFloor(summary.totalAnswers);
  if (total > 0) {
    const acc = Number(summary.accuracy);
    if (Number.isFinite(acc)) return acc;
    const correct = safeFloor(summary.correctAnswers);
    return Number(((correct / total) * 100).toFixed(2));
  }
  if (usesDiagnosticEvidence(summary)) {
    const acc = Number(summary.diagnosticAccuracy);
    if (Number.isFinite(acc)) return acc;
  }
  const acc = Number(summary.accuracy);
  return Number.isFinite(acc) ? acc : 0;
}
