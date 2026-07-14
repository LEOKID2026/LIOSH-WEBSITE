/**
 * Printable worksheet document header — centered branding + meta + name/date.
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
export default function WorksheetDocumentHeader({
  titleHe = WORKSHEET_UI_HE.documentTitle,
  meta,
  variant = "worksheet",
}) {
  const showFields = variant === "worksheet";

  return (
    <header className="worksheet-header worksheet-header-centered">
      <div className="worksheet-header-top">
        <div className="worksheet-brand-center">
          <img
            src="/images/coin.png"
            alt="LEO KIDS"
            width={56}
            height={56}
            className="worksheet-brand-logo"
          />
          <span className="worksheet-brand-name">LEO KIDS</span>
        </div>
        <h1 className="worksheet-title">{titleHe}</h1>
      </div>
      <p className="worksheet-meta">
        {meta.subjectHe} · {meta.gradeHe} · {meta.topicHe} · {meta.levelHe}
      </p>
      {showFields ? (
        <div className="worksheet-fields worksheet-fields-centered">
          <div className="worksheet-field-row">
            <span className="worksheet-field-label">{WORKSHEET_UI_HE.nameField}:</span>
            <span className="worksheet-field-line" aria-hidden="true" />
          </div>
          <div className="worksheet-field-row">
            <span className="worksheet-field-label">{WORKSHEET_UI_HE.dateField}:</span>
            <span className="worksheet-field-line" aria-hidden="true" />
          </div>
        </div>
      ) : null}
    </header>
  );
}
