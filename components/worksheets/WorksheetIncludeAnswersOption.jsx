/**
 * Shared checkbox — optional separate answer-key print.
 */

import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

/**
 * @param {{
 *   checked: boolean,
 *   onChange: (includeAnswers: boolean) => void,
 *   T: Record<string, string>,
 *   className?: string,
 * }} props
 */
export default function WorksheetIncludeAnswersOption({
  checked,
  onChange,
  T,
  className = "",
}) {
  return (
    <div className={`worksheet-form-checkboxes worksheet-include-answers-option ${className}`.trim()}>
      <label className="worksheet-checkbox-card">
        <input
          type="checkbox"
          checked={checked === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="worksheet-checkbox-card-text">
          <span className={T.label}>{WORKSHEET_UI_HE.includeAnswers}</span>
          <span className={`worksheet-checkbox-card-hint ${T.muted}`}>
            {WORKSHEET_UI_HE.answerKeySeparate}
          </span>
        </span>
      </label>
    </div>
  );
}
