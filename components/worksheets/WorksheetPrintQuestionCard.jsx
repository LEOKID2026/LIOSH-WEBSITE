/**
 * Single printable worksheet question — card shell for screen/print layouts.
 */

import WorksheetQuestionRouter from "./WorksheetQuestionRouter.jsx";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";
import { classifyWorksheetQuestionLayout } from "../../lib/worksheets/worksheet-print-layout.js";

/**
 * @param {{
 *   question: import("../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion,
 *   variant?: "default" | "math-page",
 * }} props
 */
export default function WorksheetPrintQuestionCard({ question, variant = "default" }) {
  const layoutClass = classifyWorksheetQuestionLayout(question);
  const sectionClass =
    variant === "math-page"
      ? `worksheet-print-math-card worksheet-question layout-compact-2`
      : `worksheet-question ${layoutClass}`;

  return (
    <section className={sectionClass}>
      <h2 className="worksheet-question-title">
        <span className="worksheet-question-number">{question.displayIndex}</span>
        <span>{WORKSHEET_UI_HE.questionLabel}</span>
      </h2>
      <div className="worksheet-question-content">
        <WorksheetQuestionRouter question={question} />
      </div>
    </section>
  );
}
