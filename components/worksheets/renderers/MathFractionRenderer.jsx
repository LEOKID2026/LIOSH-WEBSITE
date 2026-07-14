/**
 * Fraction / decimal expression renderer for worksheets.
 */

import WorksheetOptionsGrid from "../WorksheetOptionsGrid.jsx";
import WorksheetProseMathLines from "../WorksheetProseMathLines.jsx";
import WorksheetMathAnswerLine from "../WorksheetMathAnswerLine.jsx";

/** @param {{ question: import("../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props */
export function MathFractionRenderer({ question }) {
  const text = question.mathExpressionLtr || question.stemHe || "";

  return (
    <div className="worksheet-renderer math-fraction worksheet-renderer-compact worksheet-renderer-math-card">
      <WorksheetProseMathLines text={text} useFractionExpression />
      <WorksheetOptionsGrid optionsHe={question.optionsHe} mathNumericOptions showHeading={false} />
      {!question.optionsHe?.length ? <WorksheetMathAnswerLine /> : null}
    </div>
  );
}
