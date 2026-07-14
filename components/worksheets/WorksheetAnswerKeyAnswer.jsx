/**
 * Answer key row — mirrors question prose/math layout with stacked fractions.
 */

import { MathFractionExpression } from "../learning/MathFractionExpression.jsx";
import WorksheetProseMathLines from "./WorksheetProseMathLines.jsx";
import WorksheetMathLtr from "./WorksheetMathLtr.jsx";
import { formatAnswerKeyStemDisplay } from "../../lib/worksheets/worksheet-math-ltr-display.js";

/**
 * @param {{
 *   row: import("../../lib/worksheets/worksheet-question-types.js").AnswerKeyEntry,
 * }} props
 */
export default function WorksheetAnswerKeyAnswer({ row }) {
  const isMathQuestion =
    row.questionType === "fraction" ||
    row.questionType === "vertical_math" ||
    row.questionType === "mcq" ||
    row.questionType === "open";

  if (isMathQuestion && (row.stemHe || row.mathExpressionLtr || row.correctAnswerHe)) {
    let split = formatAnswerKeyStemDisplay(
      row.stemHe,
      row.correctAnswerHe,
      row.mathExpressionLtr
    );

    if (split.mode === "prose-only" && row.correctAnswerHe && row.stemHe) {
      split = {
        mode: "split",
        proseHe: split.proseHe || row.stemHe,
        mathLtr: row.correctAnswerHe,
      };
    }

    if (split.mode === "empty" && row.correctAnswerHe) {
      split = { mode: "math-only", proseHe: null, mathLtr: row.correctAnswerHe };
    }

    if (split.mode !== "empty" && split.mode !== "prose-only") {
      return (
        <div className="answer-key-item-body answer-key-item-body-structured">
          <WorksheetProseMathLines split={split} useFractionExpression />
        </div>
      );
    }
  }

  if (row.questionType === "fraction" && row.correctAnswerHe) {
    return (
      <div className="answer-key-item-body answer-key-item-body-structured">
        <div className="worksheet-math-balanced-slot">
          <div className="worksheet-math-expression" dir="ltr">
            <WorksheetMathLtr block className="worksheet-math-ltr-expression">
              <MathFractionExpression text={row.correctAnswerHe} />
            </WorksheetMathLtr>
          </div>
        </div>
      </div>
    );
  }

  return <p className="answer-key-item-answer">{row.correctAnswerHe}</p>;
}
