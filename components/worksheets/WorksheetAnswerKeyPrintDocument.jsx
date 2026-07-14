/**
 * A4 answer key print document — hidden on screen, shown only when printing.
 */

import WorksheetDocumentHeader from "./WorksheetDocumentHeader.jsx";
import WorksheetAnswerKeyList from "./WorksheetAnswerKeyList.jsx";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

/**
 * @param {{
 *   answerKeyPayload: import("../../lib/worksheets/worksheet-question-types.js").AnswerKeyPayload,
 * }} props
 */
export default function WorksheetAnswerKeyPrintDocument({ answerKeyPayload }) {
  const { meta, answers } = answerKeyPayload;

  return (
    <div className="worksheet-print-document" aria-hidden="true">
      <article className="worksheet-root answer-key-root">
        <WorksheetDocumentHeader
          titleHe={WORKSHEET_UI_HE.answerKeyTitle}
          meta={meta}
          variant="answer-key"
        />
        <WorksheetAnswerKeyList answers={answers} mode="print" />
      </article>
    </div>
  );
}
