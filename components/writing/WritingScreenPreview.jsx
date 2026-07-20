/**
 * Wide on-site writing worksheet preview — visible on screen only.
 */

import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";
import { WritingPageContent } from "./WritingBlockContent.jsx";

/**
 * @param {{
 *   worksheetPayload: import("../../lib/writing/writing-worksheet-types.js").WritingWorksheetPayload,
 * }} props
 */
export default function WritingScreenPreview({ worksheetPayload }) {
  const { meta, pages, scriptStyle } = worksheetPayload;

  return (
    <div className="writing-screen-preview worksheet-screen-preview" aria-label="תצוגה מקדימה">
      <header className="writing-screen-info-card worksheet-screen-info-card">
        <div className="worksheet-screen-brand" dir="ltr" lang="en">
          <span className="worksheet-screen-brand-name">LEO KIDS</span>
          <img
            src="/images/coin.png"
            alt=""
            width={64}
            height={64}
            className="worksheet-screen-brand-logo"
          />
        </div>
        <h1 className="worksheet-screen-title">{meta.titleHe || WORKSHEET_UI_HE.writingDocumentTitle}</h1>
        <p className="worksheet-screen-meta">
          {meta.categoryHe}
          {worksheetPayload.catalogNumber ? ` · ${worksheetPayload.catalogNumber}` : ""}
        </p>
      </header>

      {pages.map((page) => (
        <WritingPageContent
          key={page.pageId}
          page={page}
          meta={meta}
          scriptStyle={scriptStyle}
          mode="screen"
          inkSave={meta.inkSave}
        />
      ))}
    </div>
  );
}
