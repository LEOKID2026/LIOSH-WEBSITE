/**
 * English open-answer / writing renderer.
 */

import EnglishStemText from "../EnglishStemText.jsx";

/**
 * @param {{ question: import("../../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props
 */
export function EnglishOpenAnswerRenderer({ question }) {
  const lines = question.writingSpaceLines || 6;
  return (
    <div className="worksheet-renderer english-open">
      <EnglishStemText stemHe={question.stemHe} ltrSpans={question.ltrSpans} />
      <div className="worksheet-writing-lines" data-lines={lines} />
    </div>
  );
}
