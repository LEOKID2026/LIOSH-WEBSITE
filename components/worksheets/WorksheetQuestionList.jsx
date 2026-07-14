/**
 * Worksheet question list — shared renderer for screen preview and print document.
 */

import WorksheetQuestionRouter from "./WorksheetQuestionRouter.jsx";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";
import {
  classifyWorksheetQuestionLayout,
  getWorksheetBodyGridClass,
} from "../../lib/worksheets/worksheet-print-layout.js";

/**
 * @param {{
 *   questions: import("../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion[],
 *   mode: "screen" | "print",
 * }} props
 */
export default function WorksheetQuestionList({ questions, mode }) {
  const isPrint = mode === "print";
  const printGridClass = isPrint ? getWorksheetBodyGridClass(questions) : "";
  const bodyClass = isPrint
    ? `worksheet-body${printGridClass ? ` ${printGridClass}` : ""}`
    : "worksheet-screen-body";

  return (
    <main className={bodyClass}>
      {questions.map((q) => {
        const layoutClass = classifyWorksheetQuestionLayout(q);
        const sectionClass = isPrint
          ? `worksheet-question ${layoutClass}`
          : `worksheet-screen-question ${
              layoutClass === "layout-full"
                ? "worksheet-screen-question--full"
                : "worksheet-screen-question--card"
            }`;

        return (
          <section key={q.displayIndex} className={sectionClass}>
            <h2 className={isPrint ? "worksheet-question-title" : "worksheet-screen-question-title"}>
              <span className="worksheet-question-number">{q.displayIndex}</span>
              <span>{WORKSHEET_UI_HE.questionLabel}</span>
            </h2>
            <div className={isPrint ? "worksheet-question-content" : "worksheet-screen-question-content"}>
              <WorksheetQuestionRouter question={q} />
            </div>
          </section>
        );
      })}
    </main>
  );
}
