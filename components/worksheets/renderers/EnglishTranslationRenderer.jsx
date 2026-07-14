/**
 * English translation renderer — Hebrew stem with embedded LTR spans.
 */

import WorksheetOptionsGrid from "../WorksheetOptionsGrid.jsx";
import { renderStemWithLtrSpansHtml } from "../../../lib/worksheets/worksheet-english-display.server.js";

/**
 * @param {{ question: import("../../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion }} props
 */
export function EnglishTranslationRenderer({ question }) {
  const hasSpans = question.ltrSpans?.length;
  return (
    <div className="worksheet-renderer english-translation">
      {hasSpans ? (
        <p
          className="worksheet-stem"
          dangerouslySetInnerHTML={{
            __html: renderStemWithLtrSpansHtml(
              question.stemHe,
              question.ltrSpans,
              (t) =>
                String(t)
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
            ),
          }}
        />
      ) : (
        <p className="worksheet-stem">{question.stemHe}</p>
      )}
      <WorksheetOptionsGrid
        optionsHe={question.optionsHe}
        optionsLatin={question.optionsLatin}
        englishMode
      />
    </div>
  );
}
