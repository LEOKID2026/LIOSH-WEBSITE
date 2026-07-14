/**
 * Short math print pages — 2×2 table layout (print document only).
 */

import WorksheetPrintQuestionCard from "./WorksheetPrintQuestionCard.jsx";
import {
  buildMathPrintPageRows,
  chunkWorksheetQuestionsForMathPrint,
  shouldRenderMathPrintPages,
} from "../../lib/worksheets/worksheet-print-layout.js";

/**
 * @param {{
 *   questions: import("../../lib/worksheets/worksheet-question-types.js").PrintableWorksheetQuestion[],
 *   subjectId?: import("../../lib/worksheets/worksheet-question-types.js").WorksheetSubjectId,
 * }} props
 */
export default function WorksheetMathPrintPages({ questions, subjectId }) {
  if (!shouldRenderMathPrintPages(questions, subjectId)) {
    return null;
  }

  const pages = chunkWorksheetQuestionsForMathPrint(questions);

  return (
    <main className="worksheet-body worksheet-print-math-pages" data-print-layout="math-card-pages">
      {pages.map((pageQuestions, pageIndex) => {
        const rows = buildMathPrintPageRows(pageQuestions);
        return (
          <section
            key={`math-print-page-${pageIndex}`}
            className="worksheet-print-page worksheet-print-page--math-cards"
            data-print-page={pageIndex + 1}
          >
            <table className="worksheet-print-math-table">
              <tbody>
                {rows.map((rowQuestions, rowIndex) => (
                  <tr key={`math-print-row-${pageIndex}-${rowIndex}`}>
                    <td>
                      {rowQuestions[0] ? (
                        <WorksheetPrintQuestionCard
                          question={rowQuestions[0]}
                          variant="math-page"
                        />
                      ) : null}
                    </td>
                    <td>
                      {rowQuestions[1] ? (
                        <WorksheetPrintQuestionCard
                          question={rowQuestions[1]}
                          variant="math-page"
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
    </main>
  );
}
