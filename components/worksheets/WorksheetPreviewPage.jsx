/**
 * Worksheet preview route — separate screen layout and print document.
 */

import { useEffect } from "react";
import WorksheetPreviewActions from "./WorksheetPreviewActions.jsx";
import WorksheetScreenPreview from "./WorksheetScreenPreview.jsx";
import WorksheetPrintDocument from "./WorksheetPrintDocument.jsx";

/**
 * @param {{
 *   worksheetPayload: import("../../lib/worksheets/worksheet-question-types.js").WorksheetPayload,
 *   includeAnswers: boolean,
 *   onPrint: () => void,
 *   onAnswerKey?: () => void,
 *   answerKeyLoading?: boolean,
 *   onRefresh?: () => void,
 *   refreshLoading?: boolean,
 *   backHref?: string,
 * }} props
 */
export default function WorksheetPreviewPage({
  worksheetPayload,
  includeAnswers,
  onPrint,
  onAnswerKey,
  answerKeyLoading,
  onRefresh,
  refreshLoading,
  backHref,
}) {
  useEffect(() => {
    document.body.classList.add("worksheet-print-mode");
    return () => document.body.classList.remove("worksheet-print-mode");
  }, []);

  return (
    <div dir="rtl" lang="he" className="worksheet-preview-shell">
      <WorksheetPreviewActions
        includeAnswers={includeAnswers}
        onPrint={onPrint}
        onAnswerKey={onAnswerKey}
        answerKeyLoading={answerKeyLoading}
        onRefresh={onRefresh}
        refreshLoading={refreshLoading}
        backHref={backHref}
      />

      <WorksheetScreenPreview worksheetPayload={worksheetPayload} />
      <WorksheetPrintDocument worksheetPayload={worksheetPayload} />
    </div>
  );
}
