/**
 * Worksheet question list — shared renderer for screen preview and print document.
 */

import WorksheetMathPrintPages from "./WorksheetMathPrintPages.jsx";
import WorksheetQuestionRouter from "./WorksheetQuestionRouter.jsx";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";
import {
  classifyWorksheetQuestionLayout,
  geometryQuestionPrintModifierClasses,
  getWorksheetBodyGridClass,
  shouldRenderMathPrintPages,
  withWorksheetLayoutSubject,
} from "../../lib/worksheets/worksheet-print-layout.js";

/**
 * @param {{
 *   question: import("../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion,
 *   isPrint: boolean,
 *   subjectId?: import("../../lib/worksheets/worksheet-question-types.js").WorksheetSubjectId,
 *   index?: number,
 * }} props
 */
function WorksheetQuestionSection({ question, isPrint, subjectId, index = 0 }) {
  const normalized = withWorksheetLayoutSubject(question, subjectId);
  const layoutClass = classifyWorksheetQuestionLayout(normalized);
  const breakMods = isPrint
    ? geometryQuestionPrintModifierClasses(normalized, index, subjectId)
    : "";
  const sectionClass = isPrint
    ? `worksheet-question ${layoutClass}${breakMods}`
    : `worksheet-screen-question ${layoutClass} ${
        layoutClass === "layout-full" || layoutClass === "layout-geometry-single"
          ? "worksheet-screen-question--full"
          : "worksheet-screen-question--card"
      }`;

  return (
    <section className={sectionClass}>
      <h2 className={isPrint ? "worksheet-question-title" : "worksheet-screen-question-title"}>
        <span className="worksheet-question-number">{question.displayIndex}</span>
        <span>{WORKSHEET_UI_HE.questionLabel}</span>
      </h2>
      <div className={isPrint ? "worksheet-question-content" : "worksheet-screen-question-content"}>
        <WorksheetQuestionRouter question={question} />
      </div>
    </section>
  );
}

/**
 * @param {{
 *   questions: import("../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion[],
 *   mode: "screen" | "print",
 *   subjectId?: import("../../lib/worksheets/worksheet-question-types.js").WorksheetSubjectId,
 * }} props
 */
export default function WorksheetQuestionList({ questions, mode, subjectId }) {
  const isPrint = mode === "print";

  if (isPrint && shouldRenderMathPrintPages(questions, subjectId)) {
    return <WorksheetMathPrintPages questions={questions} subjectId={subjectId} />;
  }

  const printGridClass = isPrint ? getWorksheetBodyGridClass(questions, subjectId) : "";
  const bodyClass = isPrint
    ? `worksheet-body${printGridClass ? ` ${printGridClass}` : ""}`
    : "worksheet-screen-body";

  return (
    <main className={bodyClass}>
      {questions.map((q, index) => (
        <WorksheetQuestionSection
          key={q.displayIndex}
          question={q}
          isPrint={isPrint}
          subjectId={subjectId}
          index={index}
        />
      ))}
    </main>
  );
}
