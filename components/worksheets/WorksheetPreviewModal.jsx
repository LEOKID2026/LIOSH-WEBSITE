/**
 * In-page modal for question and writing worksheet preview + print.
 */
import { useCallback, useEffect } from "react";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";
import {
  isWritingWorksheetPayload,
} from "../../lib/worksheets/worksheet-payload-kind.client.js";
import { waitForWritingTraceAssetsReady } from "../../lib/writing/writing-print-ready.client.js";
import WorksheetPreviewActions from "./WorksheetPreviewActions.jsx";
import WorksheetScreenPreview from "./WorksheetScreenPreview.jsx";
import WorksheetPrintDocument from "./WorksheetPrintDocument.jsx";
import WritingScreenPreview from "../writing/WritingScreenPreview.jsx";
import WritingPrintDocument from "../writing/WritingPrintDocument.jsx";

/**
 * @param {{
 *   session: {
 *     worksheetPayload: import("./worksheet-question-types.js").WorksheetPayload | import("../writing/writing-worksheet-types.js").WritingWorksheetPayload,
 *     generation?: Record<string, unknown>,
 *     includeAnswers?: boolean,
 *     source?: string,
 *   } | null,
 *   onClose: () => void,
 *   onPrint?: () => void,
 *   onRefresh?: () => void,
 *   onAnswerKey?: () => void,
 *   refreshLoading?: boolean,
 *   answerKeyLoading?: boolean,
 *   errorMessage?: string,
 *   T: Record<string, string>,
 * }} props
 */
export default function WorksheetPreviewModal({
  session,
  onClose,
  onPrint,
  onRefresh,
  onAnswerKey,
  refreshLoading = false,
  answerKeyLoading = false,
  errorMessage = "",
  T,
}) {
  const worksheetPayload = session?.worksheetPayload ?? null;
  const isWriting = worksheetPayload ? isWritingWorksheetPayload(worksheetPayload) : false;
  const includeAnswers = session?.includeAnswers === true;

  const title = isWriting
    ? worksheetPayload?.meta?.titleHe || WORKSHEET_UI_HE.writingDocumentTitle
    : WORKSHEET_UI_HE.documentTitle;

  useEffect(() => {
    if (!worksheetPayload) return undefined;
    document.body.classList.add("worksheet-print-mode");
    if (isWriting) {
      document.body.classList.add("worksheet-writing-print-mode");
      const orientation =
        worksheetPayload.pages?.[0]?.orientation === "landscape" ? "landscape" : "portrait";
      document.body.classList.add(`worksheet-writing-print-orientation-${orientation}`);
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.classList.remove("worksheet-print-mode");
      document.body.classList.remove("worksheet-writing-print-mode");
      document.body.classList.remove("worksheet-writing-print-orientation-portrait");
      document.body.classList.remove("worksheet-writing-print-orientation-landscape");
      document.body.style.overflow = prevOverflow;
    };
  }, [worksheetPayload, isWriting]);

  useEffect(() => {
    if (!worksheetPayload) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [worksheetPayload, onClose]);

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
    if (onPrint) {
      onPrint();
    } else if (typeof window !== "undefined") {
      window.print();
    }
  }, [isWriting, onPrint]);

  if (!worksheetPayload || !session) return null;

  return (
    <>
      <div
        className="worksheet-preview-modal-backdrop"
        role="presentation"
        onClick={onClose}
      >
        <div
          className="worksheet-preview-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="worksheet-preview-modal-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="worksheet-preview-modal-toolbar">
            <h2 id="worksheet-preview-modal-title" className={`worksheet-preview-modal-title ${T.heading}`}>
              {title}
            </h2>
            <WorksheetPreviewActions
              includeAnswers={includeAnswers && !isWriting}
              onPrint={handlePrint}
              onAnswerKey={!isWriting ? onAnswerKey : undefined}
              answerKeyLoading={answerKeyLoading}
              onRefresh={onRefresh}
              refreshLoading={refreshLoading}
              onClose={onClose}
            />
          </div>

          {errorMessage ? (
            <p dir="rtl" className="mb-3 text-center text-sm text-red-600">{errorMessage}</p>
          ) : null}

          <div className="worksheet-preview-modal-body">
            {isWriting ? (
              <WritingScreenPreview worksheetPayload={worksheetPayload} />
            ) : (
              <WorksheetScreenPreview worksheetPayload={worksheetPayload} />
            )}
          </div>
        </div>
      </div>

      {isWriting ? (
        <WritingPrintDocument worksheetPayload={worksheetPayload} />
      ) : (
        <WorksheetPrintDocument worksheetPayload={worksheetPayload} />
      )}
    </>
  );
}
