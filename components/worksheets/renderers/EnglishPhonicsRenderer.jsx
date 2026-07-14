/**
 * Printable English phonics: Hebrew instruction + large LTR stimulus + options.
 */

import EnglishStemText from "../EnglishStemText.jsx";
import WorksheetOptionsGrid from "../WorksheetOptionsGrid.jsx";
import { EnglishLtrBlock } from "./EnglishLtrBlock.jsx";

/**
 * @param {{ question: import("../../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props
 */
export function EnglishPhonicsRenderer({ question }) {
  const stimulus = String(question.phonicsStimulus || "").trim();
  const stimulusCase = question.phonicsStimulusCase || "word";
  const optionCase = question.phonicsOptionCase || null;

  return (
    <div className="worksheet-renderer english-phonics">
      <EnglishStemText
        stemHe={question.stemHe}
        ltrSpans={[]}
        className="worksheet-stem worksheet-phonics-instruction"
      />
      {stimulus ? (
        <div
          className={`worksheet-phonics-stimulus is-${stimulusCase}`}
          dir="ltr"
        >
          <EnglishLtrBlock>{stimulus}</EnglishLtrBlock>
        </div>
      ) : null}
      <WorksheetOptionsGrid
        optionsHe={question.optionsHe}
        optionsLatin={question.optionsLatin}
        englishMode
        optionCaseMode={optionCase}
      />
    </div>
  );
}
