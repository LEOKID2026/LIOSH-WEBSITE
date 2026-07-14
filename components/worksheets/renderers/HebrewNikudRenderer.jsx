/**
 * Hebrew nikud-focused renderer — preserves niqqud marks for g1/g2.
 */

import WorksheetOptionsGrid from "../WorksheetOptionsGrid.jsx";

/**
 * @param {{ question: import("../../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props
 */
export function HebrewNikudRenderer({ question }) {
  return (
    <div className="worksheet-renderer hebrew-nikud">
      {question.passageHe ? (
        <div className="worksheet-passage worksheet-hebrew-nikud">{question.passageHe}</div>
      ) : null}
      <p className="worksheet-stem worksheet-hebrew-nikud">{question.stemHe}</p>
      <WorksheetOptionsGrid optionsHe={question.optionsHe} nikudMode={Boolean(question.hasNikud)} />
    </div>
  );
}
