/**
 * Screen-only worksheet info card — wide preview header, not print layout.
 */

import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

/**
 * @param {{
 *   titleHe?: string,
 *   meta: {
 *     subjectHe: string,
 *     gradeHe: string,
 *     topicHe: string,
 *     levelHe: string,
 *   },
 *   variant?: "worksheet" | "answer-key",
 * }} props
 */
export default function WorksheetScreenHeader({
  titleHe = WORKSHEET_UI_HE.documentTitle,
  meta,
  variant = "worksheet",
}) {
  const showFields = variant === "worksheet";

  return (
    <header className="worksheet-screen-info-card">
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
      <h1 className="worksheet-screen-title">{titleHe}</h1>
      <p className="worksheet-screen-meta">
        {meta.subjectHe} · {meta.gradeHe} · {meta.topicHe} · {meta.levelHe}
      </p>
      {showFields ? (
        <div className="worksheet-screen-fields">
          <div className="worksheet-screen-field-row">
            <span className="worksheet-screen-field-label">{WORKSHEET_UI_HE.nameField}:</span>
            <span className="worksheet-screen-field-line" aria-hidden="true" />
          </div>
          <div className="worksheet-screen-field-row">
            <span className="worksheet-screen-field-label">{WORKSHEET_UI_HE.dateField}:</span>
            <span className="worksheet-screen-field-line" aria-hidden="true" />
          </div>
        </div>
      ) : null}
    </header>
  );
}
