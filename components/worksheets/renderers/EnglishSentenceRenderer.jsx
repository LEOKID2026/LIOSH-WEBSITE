/**
 * English sentence-building MCQ renderer.
 */

import WorksheetOptionsGrid from "../WorksheetOptionsGrid.jsx";

/**
 * @param {{ question: import("../../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props
 */
export function EnglishSentenceRenderer({ question }) {
  return (
    <div className="worksheet-renderer english-sentence">
      <p className="worksheet-stem">{question.stemHe}</p>
      <WorksheetOptionsGrid
        optionsHe={question.optionsHe}
        optionsLatin={question.optionsLatin}
        englishMode
        layout="stack"
      />
    </div>
  );
}
