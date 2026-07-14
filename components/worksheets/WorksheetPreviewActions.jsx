/**
 * Action bar for worksheet preview — print, refresh, back, optional answer key.
 */

import Link from "next/link";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

/**
 * @param {{
 *   includeAnswers: boolean,
 *   onPrint: () => void,
 *   onAnswerKey?: () => void,
 *   answerKeyLoading?: boolean,
 *   onRefresh?: () => void,
 *   refreshLoading?: boolean,
 *   backHref?: string,
 * }} props
 */
export default function WorksheetPreviewActions({
  includeAnswers,
  onPrint,
  onAnswerKey,
  answerKeyLoading = false,
  onRefresh,
  refreshLoading = false,
  backHref = "/parent/worksheets",
}) {
  return (
    <div className="worksheet-preview-actions no-print">
      <button
        type="button"
        onClick={onPrint}
        className="worksheet-action-btn worksheet-action-btn-primary"
      >
        {WORKSHEET_UI_HE.print}
      </button>

      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshLoading || answerKeyLoading}
          className="worksheet-action-btn worksheet-action-btn-secondary"
        >
          {refreshLoading ? WORKSHEET_UI_HE.refreshingQuestions : WORKSHEET_UI_HE.refreshQuestions}
        </button>
      ) : null}

      {includeAnswers && onAnswerKey ? (
        <button
          type="button"
          onClick={onAnswerKey}
          disabled={answerKeyLoading || refreshLoading}
          className="worksheet-action-btn worksheet-action-btn-secondary"
        >
          {answerKeyLoading ? WORKSHEET_UI_HE.loading : WORKSHEET_UI_HE.answerKey}
        </button>
      ) : null}

      <Link href={backHref} className="worksheet-action-btn worksheet-action-btn-ghost">
        {WORKSHEET_UI_HE.back}
      </Link>
    </div>
  );
}
