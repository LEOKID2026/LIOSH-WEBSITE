/**
 * Hebrew open-answer / writing renderer.
 */

/**
 * @param {{ question: import("../../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props
 */
export function HebrewOpenAnswerRenderer({ question }) {
  const lines = question.writingSpaceLines || 6;
  const nikud = question.hasNikud ? " worksheet-hebrew-nikud" : "";
  return (
    <div className="worksheet-renderer hebrew-open">
      <p className={`worksheet-stem${nikud}`}>{question.stemHe}</p>
      <div className="worksheet-writing-lines" data-lines={lines} />
    </div>
  );
}
