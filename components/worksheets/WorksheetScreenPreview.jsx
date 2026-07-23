/**
 * Wide on-site worksheet preview — visible on screen only.
 */

import WorksheetScreenHeader from "./WorksheetScreenHeader.jsx";
import WorksheetQuestionList from "./WorksheetQuestionList.jsx";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

/**
 * @param {{
 *   worksheetPayload: import("../../lib/worksheets/worksheet-question-types.js").WorksheetPayload,
 *   titleTag?: "h1" | "h2" | "h3" | "p",
 * }} props
 */
export default function WorksheetScreenPreview({ worksheetPayload, titleTag = "h1" }) {
  const { meta, questions } = worksheetPayload;

  return (
    <div className="worksheet-screen-preview" aria-label="תצוגה מקדימה">
      <WorksheetScreenHeader
        titleHe={WORKSHEET_UI_HE.documentTitle}
        meta={meta}
        variant="worksheet"
        titleTag={titleTag}
      />
      <WorksheetQuestionList questions={questions} mode="screen" />
    </div>
  );
}
