/**
 * Geometry text / MCQ renderer for printable worksheets.
 */

import WorksheetMathAnswerLine from "../WorksheetMathAnswerLine.jsx";
import WorksheetOptionsGrid from "../WorksheetOptionsGrid.jsx";

/**
 * @param {{ question: import("../../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props
 */
export function GeometryTextRenderer({ question }) {
  const showMcq = Boolean(question.optionsHe?.length);

  return (
    <div className="worksheet-renderer geometry-text">
      <p className="worksheet-stem">{question.stemHe}</p>
      {showMcq ? (
        <WorksheetOptionsGrid optionsHe={question.optionsHe} />
      ) : (
        <WorksheetMathAnswerLine />
      )}
    </div>
  );
}
