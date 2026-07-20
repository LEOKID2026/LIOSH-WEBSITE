/**
 * Routes worksheet payload to question vs writing vs coloring preview/print components.
 */

import {
  isColoringWorksheetPayload,
  isWritingWorksheetPayload,
} from "../../lib/worksheets/worksheet-payload-kind.client.js";
import WorksheetScreenPreview from "../worksheets/WorksheetScreenPreview.jsx";
import WorksheetPrintDocument from "../worksheets/WorksheetPrintDocument.jsx";
import WritingScreenPreview from "./WritingScreenPreview.jsx";
import WritingPrintDocument from "./WritingPrintDocument.jsx";
import ColoringScreenPreview from "../coloring/ColoringScreenPreview.jsx";
import ColoringPrintDocument from "../coloring/ColoringPrintDocument.jsx";

/**
 * @param {{
 *   worksheetPayload: import("../../lib/worksheets/worksheet-question-types.js").WorksheetPayload | import("../../lib/writing/writing-worksheet-types.js").WritingWorksheetPayload | import("../../lib/coloring/coloring-worksheet-types.js").ColoringWorksheetPayload,
 * }} props
 */
export default function WritingPageRouter({ worksheetPayload }) {
  if (isColoringWorksheetPayload(worksheetPayload)) {
    return (
      <>
        <ColoringScreenPreview worksheetPayload={worksheetPayload} />
        <ColoringPrintDocument worksheetPayload={worksheetPayload} />
      </>
    );
  }

  if (isWritingWorksheetPayload(worksheetPayload)) {
    return (
      <>
        <WritingScreenPreview worksheetPayload={worksheetPayload} />
        <WritingPrintDocument worksheetPayload={worksheetPayload} />
      </>
    );
  }

  return (
    <>
      <WorksheetScreenPreview worksheetPayload={worksheetPayload} />
      <WorksheetPrintDocument worksheetPayload={worksheetPayload} />
    </>
  );
}
