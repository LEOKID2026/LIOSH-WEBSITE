/**
 * Writing print document — one physical page per payload page, header on first page only.
 */

import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";
import { writingPageHasContent } from "../../lib/writing/writing-page-utils.js";
import { WritingPageContent } from "./WritingBlockContent.jsx";

/**
 * @param {{
 *   worksheetPayload: import("../../lib/writing/writing-worksheet-types.js").WritingWorksheetPayload,
 * }} props
 */
export default function WritingPrintDocument({ worksheetPayload }) {
  const { meta, pages, scriptStyle } = worksheetPayload;
  const inkClass = meta.inkSave ? " writing-root--ink-save" : "";
  const primaryOrientation =
    pages.length === 1
      ? pages[0].orientation === "landscape"
        ? "landscape"
        : "portrait"
      : pages.some((p) => p.orientation === "landscape") && !pages.some((p) => p.orientation !== "landscape")
        ? "landscape"
        : "portrait";

  const printablePages = pages.filter(writingPageHasContent);

  return (
    <div
      className={`worksheet-print-document writing-print-document${inkClass}`}
      data-page-orientation={primaryOrientation}
      data-page-count={printablePages.length}
    >
      {printablePages.map((page, pageIndex) => (
        <WritingPageContent
          key={page.pageId}
          page={page}
          meta={meta}
          scriptStyle={scriptStyle}
          mode="print"
          inkSave={meta.inkSave}
          showPrintHeader={pageIndex === 0}
          printHeaderTitle={meta.titleHe || WORKSHEET_UI_HE.writingDocumentTitle}
          isLastPrintPage={pageIndex === printablePages.length - 1}
        />
      ))}
    </div>
  );
}
