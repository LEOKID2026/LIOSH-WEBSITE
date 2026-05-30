import { useEffect, useMemo, useState } from "react";
import StudentQuestionDisplay from "../learning/StudentQuestionDisplay.jsx";
import {
  canStudentActivityQuestionDisplayVertically,
  getStudentActivityVerticalExerciseText,
  normalizeStudentActivityMathLayoutQuestion,
} from "../../lib/classroom-activities/student-activity-question-ui.client.js";
import { getQuestionFontStyle } from "../../utils/learning-question-font";

/**
 * Question surface for assigned activities — same vertical/horizontal toggle as math-master.
 *
 * @param {{ question: Record<string, unknown>|null|undefined, questionIndex: number }} props
 */
export default function StudentActivityQuestionSurface({ question, questionIndex }) {
  const [isVerticalDisplay, setIsVerticalDisplay] = useState(false);

  const layoutQuestion = useMemo(
    () => normalizeStudentActivityMathLayoutQuestion(question),
    [question]
  );

  const canDisplayVertically = useMemo(
    () => canStudentActivityQuestionDisplayVertically(layoutQuestion),
    [layoutQuestion]
  );

  const verticalText = useMemo(
    () => getStudentActivityVerticalExerciseText(layoutQuestion),
    [layoutQuestion]
  );

  useEffect(() => {
    setIsVerticalDisplay(false);
  }, [questionIndex]);

  if (!layoutQuestion) return null;

  return (
    <div className="relative w-full shrink-0 min-h-[230px] md:min-h-[260px] flex flex-col items-center justify-center px-2 mb-6">
      {canDisplayVertically ? (
        <button
          type="button"
          onClick={() => setIsVerticalDisplay((prev) => !prev)}
          className="absolute top-2 left-2 z-10 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/80 hover:bg-purple-500 text-white transition-all pointer-events-auto shadow-lg"
          title={isVerticalDisplay ? "הצג מאוזן" : "הצג מאונך"}
          data-testid="activity-math-layout-toggle"
        >
          {isVerticalDisplay ? "↔️ מאוזן" : "↕️ מאונך"}
        </button>
      ) : null}

      {isVerticalDisplay && canDisplayVertically && verticalText ? (
        <div className="relative w-full pr-2 pl-2 pt-0">
          {layoutQuestion.questionLabel ? (
            <p
              className="text-2xl text-center text-white mb-2 break-words overflow-wrap-anywhere max-w-full px-2"
              dir="rtl"
              data-testid="student-question-lead"
              style={{
                direction: "rtl",
                unicodeBidi: "plaintext",
                ...getQuestionFontStyle({
                  text: layoutQuestion.questionLabel,
                  kind: "label",
                }),
              }}
            >
              {layoutQuestion.questionLabel}
            </p>
          ) : null}
          <div
            className="flex justify-center w-full max-w-full px-2 overflow-x-hidden"
            data-testid="student-question-body"
            dir="ltr"
          >
            <pre
              className="text-3xl text-center text-white font-bold font-mono whitespace-pre"
              style={{
                direction: "ltr",
                unicodeBidi: "isolate",
                ...getQuestionFontStyle({ text: verticalText }),
              }}
            >
              {verticalText}
            </pre>
          </div>
        </div>
      ) : (
        <div className="relative w-full pr-2 pl-2 pt-0">
          <StudentQuestionDisplay
            question={layoutQuestion.question}
            questionLabel={layoutQuestion.questionLabel}
            exerciseText={layoutQuestion.exerciseText || layoutQuestion.question}
            getQuestionFontStyle={getQuestionFontStyle}
            wrapperClassName="relative w-full pr-2 pl-2 pt-0 w-full flex flex-col items-center justify-center gap-1"
            bodyClassName="text-4xl text-center text-white font-bold max-w-full px-2"
          />
        </div>
      )}
    </div>
  );
}
