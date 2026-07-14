/**
 * Hebrew MCQ renderer for printable worksheets.
 */

import WorksheetOptionsGrid from "../WorksheetOptionsGrid.jsx";

/**
 * @param {{ question: import("../../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props
 */
export function HebrewMcqRenderer({ question }) {
  const stemClass = question.hasNikud
    ? "worksheet-stem worksheet-hebrew-nikud"
    : "worksheet-stem";
  return (
    <div className="worksheet-renderer hebrew-mcq">
      <p className={stemClass}>{question.stemHe}</p>
      <WorksheetOptionsGrid
        optionsHe={question.optionsHe}
        nikudMode={Boolean(question.hasNikud)}
      />
    </div>
  );
}
