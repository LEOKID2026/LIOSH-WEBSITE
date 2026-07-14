/**
 * A4 print document — hidden on screen, shown only when printing.
 */

import WorksheetDocumentHeader from "./WorksheetDocumentHeader.jsx";
import WorksheetQuestionList from "./WorksheetQuestionList.jsx";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

/**
 * @param {{
 *   worksheetPayload: import("../../lib/worksheets/worksheet-question-types.js").WorksheetPayload,
 * }} props
 */
export default function WorksheetPrintDocument({ worksheetPayload }) {
  const { meta, questions } = worksheetPayload;
  const inkClass = meta.inkSave ? " ink-save" : "";

  return (
    <div className="worksheet-print-document">
      <article className={`worksheet-root${inkClass}`}>
        <WorksheetDocumentHeader
          titleHe={WORKSHEET_UI_HE.documentTitle}
          meta={meta}
          variant="worksheet"
        />
        <WorksheetQuestionList
          questions={questions}
          mode="print"
          subjectId={meta.subjectId}
        />
      </article>
    </div>
  );
}
