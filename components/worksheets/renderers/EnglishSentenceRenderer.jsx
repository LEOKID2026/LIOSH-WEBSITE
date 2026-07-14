/**
 * English sentence-building MCQ renderer.
 */

import EnglishStemText from "../EnglishStemText.jsx";
import WorksheetOptionsGrid from "../WorksheetOptionsGrid.jsx";

/**
 * @param {{ question: import("../../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props
 */
export function EnglishSentenceRenderer({ question }) {
  return (
    <div className="worksheet-renderer english-sentence">
      <EnglishStemText stemHe={question.stemHe} ltrSpans={question.ltrSpans} />
      <WorksheetOptionsGrid
        optionsHe={question.optionsHe}
        optionsLatin={question.optionsLatin}
        englishMode
        layout="stack"
      />
    </div>
  );
}
