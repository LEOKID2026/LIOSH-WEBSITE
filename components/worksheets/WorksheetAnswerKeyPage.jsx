/**
 * Answer key preview — separate screen layout and print document.
 */

import { useEffect } from "react";
import Link from "next/link";
import WorksheetAnswerKeyScreenPreview from "./WorksheetAnswerKeyScreenPreview.jsx";
import WorksheetAnswerKeyPrintDocument from "./WorksheetAnswerKeyPrintDocument.jsx";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

/**
 * @param {{
 *   answerKeyPayload: import("../../lib/worksheets/worksheet-question-types.js").AnswerKeyPayload,
 *   onPrint: () => void,
 *   backHref?: string,
 * }} props
 */
export default function WorksheetAnswerKeyPage({
  answerKeyPayload,
  onPrint,
  backHref = "/parent/worksheets/preview",
}) {
  useEffect(() => {
    document.body.classList.add("worksheet-print-mode");
    return () => document.body.classList.remove("worksheet-print-mode");
  }, []);

  return (
    <div dir="rtl" lang="he" className="worksheet-preview-shell">
      <div className="worksheet-preview-actions no-print">
        <button
          type="button"
          onClick={onPrint}
          className="worksheet-action-btn worksheet-action-btn-primary"
        >
          {WORKSHEET_UI_HE.print}
        </button>
        <Link href={backHref} className="worksheet-action-btn worksheet-action-btn-ghost">
          {WORKSHEET_UI_HE.back}
        </Link>
      </div>

      <WorksheetAnswerKeyScreenPreview answerKeyPayload={answerKeyPayload} />
      <WorksheetAnswerKeyPrintDocument answerKeyPayload={answerKeyPayload} />
    </div>
  );
}
