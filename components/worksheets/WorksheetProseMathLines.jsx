/**
 * Worksheet stem — optional RTL prose line + LTR math line (2-row layout).
 * Prose and math slots are always reserved for uniform card alignment.
 */

import {
  MathFractionExpression,
  renderMathFractionAwareText,
} from "../learning/MathFractionExpression.jsx";
import WorksheetStemText from "./WorksheetStemText.jsx";
import WorksheetMathLtr from "./WorksheetMathLtr.jsx";
import { splitWorksheetStemProseAndMath } from "../../lib/worksheets/worksheet-math-ltr-display.js";
import { hasStackedFractionToken } from "../../utils/math-fraction-expression-parse.js";

/**
 * @param {{
 *   text?: string,
 *   split?: import("../../lib/worksheets/worksheet-math-ltr-display.js").WorksheetStemSplit,
 *   useFractionExpression?: boolean,
 *   className?: string,
 * }} props
 */
export default function WorksheetProseMathLines({
  text = "",
  split: splitOverride,
  useFractionExpression = false,
  className = "",
}) {
  const split = splitOverride || splitWorksheetStemProseAndMath(text);
  const showProse =
    split.mode === "split" ||
    split.mode === "mixed-inline" ||
    split.mode === "prose-only";
  const showMath = split.mode === "split" || split.mode === "math-only";
  const inlineProse = split.proseHe || text;
  const inlineUsesStackedFractions =
    useFractionExpression && hasStackedFractionToken(inlineProse);

  const renderMath = (mathLtr) => (
    <div className="worksheet-math-expression" dir="ltr">
      <WorksheetMathLtr block className="worksheet-math-ltr-expression">
        {useFractionExpression ? (
          <MathFractionExpression text={mathLtr || ""} />
        ) : (
          mathLtr
        )}
      </WorksheetMathLtr>
    </div>
  );

  return (
    <div className={`worksheet-prose-math-lines${className ? ` ${className}` : ""}`}>
      <div
        className={`worksheet-stem-prose-slot${showProse ? "" : " worksheet-stem-prose-slot-empty"}`}
        aria-hidden={!showProse}
      >
        {showProse ? (
          split.mode === "mixed-inline" || split.mode === "prose-only" ? (
            inlineUsesStackedFractions ? (
              <p className="worksheet-stem" dir="rtl">
                {renderMathFractionAwareText(inlineProse)}
              </p>
            ) : (
              <WorksheetStemText text={inlineProse} />
            )
          ) : (
            <p className="worksheet-stem worksheet-stem-prose" dir="rtl">
              {split.proseHe}
            </p>
          )
        ) : null}
      </div>
      <div
        className={`worksheet-math-balanced-slot${showMath ? "" : " worksheet-math-balanced-slot-empty"}`}
        aria-hidden={!showMath}
      >
        {showMath ? renderMath(split.mathLtr || "") : null}
      </div>
    </div>
  );
}
