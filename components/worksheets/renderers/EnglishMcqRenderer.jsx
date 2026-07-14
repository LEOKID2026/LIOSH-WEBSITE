/**
 * English MCQ renderer with LTR options support.
 */

import WorksheetOptionsGrid from "../WorksheetOptionsGrid.jsx";

/**
 * @param {{ question: import("../../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props
 */
export function EnglishMcqRenderer({ question }) {
  return (
    <div className="worksheet-renderer english-mcq">
      <p className="worksheet-stem">{question.stemHe}</p>
      <WorksheetOptionsGrid
        optionsHe={question.optionsHe}
        optionsLatin={question.optionsLatin}
        englishMode
      />
    </div>
  );
}
