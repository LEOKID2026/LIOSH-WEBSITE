/**
 * English MCQ renderer with LTR options support.
 */

import EnglishStemText from "../EnglishStemText.jsx";
import WorksheetOptionsGrid from "../WorksheetOptionsGrid.jsx";

/**
 * @param {{ question: import("../../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props
 */
export function EnglishMcqRenderer({ question }) {
  return (
    <div className="worksheet-renderer english-mcq">
      <EnglishStemText stemHe={question.stemHe} ltrSpans={question.ltrSpans} />
      <WorksheetOptionsGrid
        optionsHe={question.optionsHe}
        optionsLatin={question.optionsLatin}
        englishMode
      />
    </div>
  );
}
