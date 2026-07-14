/**
 * Geometry text / MCQ renderer for printable worksheets.
 */

import WorksheetOptionsGrid from "../WorksheetOptionsGrid.jsx";

/**
 * @param {{ question: import("../../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props
 */
export function GeometryTextRenderer({ question }) {
  return (
    <div className="worksheet-renderer geometry-text">
      <p className="worksheet-stem">{question.stemHe}</p>
      <WorksheetOptionsGrid optionsHe={question.optionsHe} />
    </div>
  );
}
