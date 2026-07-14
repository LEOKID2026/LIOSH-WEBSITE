/**
 * Plain horizontal math worksheet renderer.
 */

import WorksheetOptionsGrid from "../WorksheetOptionsGrid.jsx";
import WorksheetProseMathLines from "../WorksheetProseMathLines.jsx";
import WorksheetMathAnswerLine from "../WorksheetMathAnswerLine.jsx";
import { isWorksheetMathLtrExpression, worksheetStemHasHebrew } from "../../../lib/worksheets/worksheet-math-ltr-display.js";

/** @param {{ question: import("../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props */
export function MathPlainRenderer({ question }) {
  const text = question.mathExpressionLtr || question.stemHe || "";
  const useFraction =
    Boolean(question.mathExpressionLtr) &&
    (/\//.test(text) || worksheetStemHasHebrew(text));

  return (
    <div className="worksheet-renderer math-plain worksheet-renderer-compact worksheet-renderer-math-card">
      <WorksheetProseMathLines text={text} useFractionExpression={useFraction} />
      <WorksheetOptionsGrid optionsHe={question.optionsHe} mathNumericOptions showHeading={false} />
      {!question.optionsHe?.length ? <WorksheetMathAnswerLine /> : null}
    </div>
  );
}
