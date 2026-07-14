/**
 * Hebrew passage MCQ renderer — short reading passages.
 */

import WorksheetOptionsGrid from "../WorksheetOptionsGrid.jsx";

/**
 * @param {{ question: import("../../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props
 */
export function HebrewPassageRenderer({ question }) {
  const nikud = question.hasNikud ? " worksheet-hebrew-nikud" : "";
  return (
    <div className="worksheet-renderer hebrew-passage">
      {question.passageHe ? (
        <div className={`worksheet-passage${nikud}`}>{question.passageHe}</div>
      ) : null}
      <p className={`worksheet-stem${nikud}`}>{question.stemHe}</p>
      <WorksheetOptionsGrid
        optionsHe={question.optionsHe}
        nikudMode={Boolean(question.hasNikud)}
      />
    </div>
  );
}
