import { useEffect, useMemo, useState } from "react";
import StudentQuestionDisplay from "../learning/StudentQuestionDisplay.jsx";
import {
  canStudentActivityQuestionDisplayVertically,
  getStudentActivityVerticalExerciseText,
} from "../../lib/classroom-activities/student-activity-question-ui.client.js";
import { getQuestionFontStyle } from "../../utils/learning-question-font";

/**
 * Question surface for assigned activities — reuses vertical/horizontal toggle from subject practice.
 *
 * @param {{ question: Record<string, unknown>|null|undefined, questionIndex: number }} props
 */
export default function StudentActivityQuestionSurface({ question, questionIndex }) {
  const [isVerticalDisplay, setIsVerticalDisplay] = useState(false);

  const canDisplayVertically = useMemo(
    () => canStudentActivityQuestionDisplayVertically(question),
    [question]
  );

  const verticalText = useMemo(
    () => getStudentActivityVerticalExerciseText(question),
    [question]
  );

  useEffect(() => {
    setIsVerticalDisplay(false);
  }, [questionIndex]);

  if (!question) return null;

  return (
    <div className="relative w-full mb-6">
      {canDisplayVertically ? (
        <button
          type="button"
          onClick={() => setIsVerticalDisplay((prev) => !prev)}
          className="absolute top-0 left-0 z-10 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/80 hover:bg-purple-500 text-white transition-all shadow-lg"
          title={isVerticalDisplay ? "הצג מאוזן" : "הצג מאונך"}
        >
          {isVerticalDisplay ? "↔️ מאוזן" : "↕️ מאונך"}
        </button>
      ) : null}

      {isVerticalDisplay && canDisplayVertically && verticalText ? (
        <div className="relative w-full pt-8">
          {question.questionLabel ? (
            <p
              className="text-2xl text-center text-white mb-2 break-words max-w-full px-2"
              dir="rtl"
            >
              {String(question.questionLabel)}
            </p>
          ) : null}
          <div className="flex justify-center w-full max-w-full px-2 overflow-x-hidden" dir="ltr">
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
        <div className="pt-2">
          <StudentQuestionDisplay
            question={question.question}
            questionLabel={question.questionLabel}
            exerciseText={question.exerciseText}
            getQuestionFontStyle={getQuestionFontStyle}
          />
        </div>
      )}
    </div>
  );
}
