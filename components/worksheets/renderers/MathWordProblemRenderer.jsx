/**
 * Word problem renderer — story text + answer space (no auto vertical column).
 */

/** @param {{ question: import("../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props */
export function MathWordProblemRenderer({ question }) {
  const lines = question.writingSpaceLines || 4;
  const body = question.wordProblemBodyHe || question.stemHe;
  return (
    <div className="worksheet-renderer math-word-problem">
      <div className="worksheet-word-problem">{body}</div>
      <div className="worksheet-writing-lines" data-lines={lines} />
    </div>
  );
}
