/**
 * MCQ options grid — Hebrew labels א/ב/ג/ד, display only.
 */

import { EnglishLtrBlock } from "./renderers/EnglishLtrBlock.jsx";
import WorksheetMathLtr from "./WorksheetMathLtr.jsx";
import { isWorksheetNumericOption } from "../../lib/worksheets/worksheet-math-ltr-display.js";

const OPTION_LABELS_HE = ["א", "ב", "ג", "ד", "ה", "ו"];

/**
 * @param {{
 *   optionsHe?: string[],
 *   optionsLatin?: boolean[],
 *   englishMode?: boolean,
 *   layout?: "grid" | "stack",
 *   showHeading?: boolean,
 *   mathNumericOptions?: boolean,
 * }} props
 */
export default function WorksheetOptionsGrid({
  optionsHe = [],
  optionsLatin,
  englishMode = false,
  layout = "grid",
  showHeading = true,
  mathNumericOptions = false,
}) {
  if (!optionsHe.length) return null;

  const listClass =
    layout === "stack"
      ? "worksheet-options worksheet-options-stack"
      : "worksheet-options worksheet-options-grid";

  return (
    <div className="worksheet-options-section">
      {showHeading ? <p className="worksheet-options-heading">אפשרויות:</p> : null}
      <ol className={listClass}>
        {optionsHe.map((opt, i) => {
          const label = OPTION_LABELS_HE[i] || String(i + 1);
          const useEnglishLtr =
            englishMode && (optionsLatin?.[i] ?? /[A-Za-z]/.test(String(opt)));
          const useMathLtr =
            !useEnglishLtr &&
            (mathNumericOptions || isWorksheetNumericOption(opt));
          return (
            <li key={`${i}-${opt}`} className="worksheet-option-cell">
              <span className="worksheet-option-label" aria-hidden="true">
                {label}.
              </span>
              <span className="worksheet-option-text">
                {useEnglishLtr ? (
                  <EnglishLtrBlock>{opt}</EnglishLtrBlock>
                ) : useMathLtr ? (
                  <WorksheetMathLtr>{opt}</WorksheetMathLtr>
                ) : (
                  opt
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
