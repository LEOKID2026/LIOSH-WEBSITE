/**
 * Word problem renderer — story text + answer space inside math card.
 */

/** @param {{ question: import("../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props */
export function MathWordProblemRenderer({ question }) {
  const lines = question.writingSpaceLines || 4;
  const body = question.wordProblemBodyHe || question.stemHe;
  return (
    <div className="worksheet-renderer math-word-problem worksheet-renderer-compact worksheet-renderer-math-card">
      <div className="worksheet-word-problem" dir="rtl">
        {body}
      </div>
      <div className="worksheet-writing-lines" data-lines={lines} aria-hidden="true" />
    </div>
  );
}
