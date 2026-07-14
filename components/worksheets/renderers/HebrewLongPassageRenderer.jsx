/**
 * Hebrew long passage renderer — comprehension texts on A4.
 */

import WorksheetOptionsGrid from "../WorksheetOptionsGrid.jsx";

/**
 * @param {{ question: import("../../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props
 */
export function HebrewLongPassageRenderer({ question }) {
  const nikud = question.hasNikud ? " worksheet-hebrew-nikud" : "";
  return (
    <div className="worksheet-renderer hebrew-long-passage">
      {question.passageHe ? (
        <div className={`worksheet-passage worksheet-passage-long${nikud}`}>
          {question.passageHe}
        </div>
      ) : null}
      <p className={`worksheet-stem${nikud}`}>{question.stemHe}</p>
      <WorksheetOptionsGrid
        optionsHe={question.optionsHe}
        nikudMode={Boolean(question.hasNikud)}
      />
    </div>
  );
}
