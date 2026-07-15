/**
 * Vertical arithmetic layout renderer for print worksheets — vertical only.
 */

import {
  parseLongDivisionBracketFromVertical,
  stripMathLtrMarkers,
} from "../../../lib/worksheets/worksheet-math-display.server.js";
import WorksheetOptionsGrid from "../WorksheetOptionsGrid.jsx";
import WorksheetProseMathLines from "../WorksheetProseMathLines.jsx";
import WorksheetMathAnswerLine from "../WorksheetMathAnswerLine.jsx";

function stemIsProseOnly(stemHe) {
  const stem = String(stemHe || "").trim();
  if (!stem) return false;
  return !/[0-9+\-×÷=]/.test(stem);
}

/** @param {{ question: import("../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props */
export function MathVerticalLayoutRenderer({ question }) {
  const vertical = stripMathLtrMarkers(question.verticalLayoutLtr || "");
  const longDivision = parseLongDivisionBracketFromVertical(vertical);
  const proseStem = stemIsProseOnly(question.stemHe) ? question.stemHe : "";

  return (
    <div className="worksheet-renderer math-vertical worksheet-renderer-compact worksheet-renderer-math-card">
      {proseStem ? <WorksheetProseMathLines text={proseStem} /> : null}
      {longDivision ? (
        <div className="worksheet-math-vertical-slot">
          <div className="worksheet-math-block worksheet-math-block-compact worksheet-math-block-vertical">
            <div
              className="worksheet-long-division"
              dir="ltr"
              data-testid="worksheet-long-division"
            >
              <span className="worksheet-long-division-dividend">{longDivision.dividend}</span>
              <span className="worksheet-long-division-divisor">{longDivision.divisor}</span>
            </div>
          </div>
        </div>
      ) : vertical ? (
        <div className="worksheet-math-vertical-slot">
          <div className="worksheet-math-block worksheet-math-block-compact worksheet-math-block-vertical">
            <pre className="worksheet-math-vertical" dir="ltr" data-testid="worksheet-math-vertical">
              {vertical}
            </pre>
          </div>
        </div>
      ) : (
        <div className="worksheet-math-vertical-slot worksheet-math-vertical-slot-empty" aria-hidden="true" />
      )}
      <WorksheetOptionsGrid optionsHe={question.optionsHe} mathNumericOptions showHeading={false} />
      {!question.optionsHe?.length ? <WorksheetMathAnswerLine /> : null}
    </div>
  );
}
