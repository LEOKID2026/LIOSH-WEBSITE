/**
 * Answer key list — shared renderer for screen preview and print document.
 */

import WorksheetAnswerKeyAnswer from "./WorksheetAnswerKeyAnswer.jsx";
import { getAnswerKeyGridClass } from "../../lib/worksheets/worksheet-print-layout.js";

/**
 * @param {{
 *   answers: import("../../lib/worksheets/worksheet-question-types.js").AnswerKeyRow[],
 *   mode: "screen" | "print",
 * }} props
 */
export default function WorksheetAnswerKeyList({ answers, mode }) {
  const isPrint = mode === "print";
  const listClass = isPrint
    ? getAnswerKeyGridClass(answers)
    : "worksheet-screen-answer-grid";

  return (
    <ol className={listClass}>
      {answers.map((row) => (
        <li
          key={row.displayIndex}
          className={isPrint ? "answer-key-item" : "worksheet-screen-answer-card"}
        >
          <div className={isPrint ? "answer-key-item-head" : "worksheet-screen-answer-head"}>
            <span className="worksheet-question-number">{row.displayIndex}</span>
            <span>תשובה</span>
          </div>
          <WorksheetAnswerKeyAnswer row={row} />
          {row.explanationHe ? (
            <p className={isPrint ? "answer-key-item-explanation" : "worksheet-screen-answer-explanation"}>
              {row.explanationHe}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
