/**
 * Worksheet preview route — separate screen layout and print document.
 */

import { useCallback, useEffect } from "react";
import WorksheetPreviewActions from "./WorksheetPreviewActions.jsx";
import WritingPageRouter from "../writing/WritingPageRouter.jsx";
import { isColoringWorksheetPayload, isWritingWorksheetPayload } from "../../lib/worksheets/worksheet-payload-kind.client.js";
import { waitForWritingTraceAssetsReady } from "../../lib/writing/writing-print-ready.client.js";

/**
 * @param {{
 *   worksheetPayload: import("../../lib/worksheets/worksheet-question-types.js").WorksheetPayload | import("../../lib/writing/writing-worksheet-types.js").WritingWorksheetPayload,
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
  const isWriting = isWritingWorksheetPayload(worksheetPayload);
  const isColoring = isColoringWorksheetPayload(worksheetPayload);

  const handlePrint = useCallback(async () => {
    if (isWriting) {
      try {
        await waitForWritingTraceAssetsReady();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (typeof window !== "undefined") {
          window.alert(`לא ניתן להדפיס: ${message}`);
        }
        return;
      }
    }
    onPrint();
  }, [isWriting, onPrint]);

  useEffect(() => {
    document.body.classList.add("worksheet-print-mode");
    if (isWritingWorksheetPayload(worksheetPayload)) {
      document.body.classList.add("worksheet-writing-print-mode");
      const orientation =
        worksheetPayload.pages?.[0]?.orientation === "landscape" ? "landscape" : "portrait";
      document.body.classList.add(`worksheet-writing-print-orientation-${orientation}`);
    }
    if (isColoringWorksheetPayload(worksheetPayload)) {
      document.body.classList.add("worksheet-coloring-print-mode");
    }
    return () => {
      document.body.classList.remove("worksheet-print-mode");
      document.body.classList.remove("worksheet-writing-print-mode");
      document.body.classList.remove("worksheet-writing-print-orientation-portrait");
      document.body.classList.remove("worksheet-writing-print-orientation-landscape");
      document.body.classList.remove("worksheet-coloring-print-mode");
    };
  }, [worksheetPayload]);

  return (
    <div dir="rtl" lang="he" className="worksheet-preview-shell">
      <WorksheetPreviewActions
        includeAnswers={includeAnswers && !isWriting && !isColoring}
        onPrint={handlePrint}
        onAnswerKey={isWriting || isColoring ? undefined : onAnswerKey}
        answerKeyLoading={answerKeyLoading}
        onRefresh={onRefresh}
        refreshLoading={refreshLoading}
        backHref={backHref}
      />

      <WritingPageRouter worksheetPayload={worksheetPayload} />
    </div>
  );
}
