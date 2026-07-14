/**
 * English open-answer / writing renderer.
 */

/**
 * @param {{ question: import("../../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props
 */
export function EnglishOpenAnswerRenderer({ question }) {
  const lines = question.writingSpaceLines || 5;
  return (
    <div className="worksheet-renderer english-open">
      <p className="worksheet-stem">{question.stemHe}</p>
      <div className="worksheet-writing-lines" data-lines={lines} />
    </div>
  );
}
