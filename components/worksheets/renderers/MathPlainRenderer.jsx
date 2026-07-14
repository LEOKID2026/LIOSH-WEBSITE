/**
 * Plain horizontal math worksheet renderer.
 */

import WorksheetOptionsGrid from "../WorksheetOptionsGrid.jsx";
import WorksheetProseMathLines from "../WorksheetProseMathLines.jsx";
import WorksheetMathAnswerLine from "../WorksheetMathAnswerLine.jsx";
import { worksheetStemHasHebrew } from "../../../lib/worksheets/worksheet-math-ltr-display.js";

/** @param {{ question: import("../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props */
export function MathPlainRenderer({ question }) {
  const math = String(question.mathExpressionLtr || "").trim();
  const stem = String(question.stemHe || "").trim();
  const remainderSplit =
    Boolean(math) &&
    Boolean(stem) &&
    math !== stem &&
    /שארית/.test(stem) &&
    !/שארית/.test(math);

  if (remainderSplit) {
    return (
      <div className="worksheet-renderer math-plain worksheet-renderer-compact worksheet-renderer-math-card">
        <WorksheetProseMathLines text={math} />
        <p className="worksheet-remainder-prompt" dir="rtl">
          {stem}
        </p>
        <WorksheetOptionsGrid optionsHe={question.optionsHe} mathNumericOptions showHeading={false} />
        {!question.optionsHe?.length ? <WorksheetMathAnswerLine /> : null}
      </div>
    );
  }

  const text = math || stem || "";
  const useFraction =
    Boolean(math) && (/\//.test(text) || worksheetStemHasHebrew(text));

  return (
    <div className="worksheet-renderer math-plain worksheet-renderer-compact worksheet-renderer-math-card">
      <WorksheetProseMathLines text={text} useFractionExpression={useFraction} />
      <WorksheetOptionsGrid optionsHe={question.optionsHe} mathNumericOptions showHeading={false} />
      {!question.optionsHe?.length ? <WorksheetMathAnswerLine /> : null}
    </div>
  );
}
