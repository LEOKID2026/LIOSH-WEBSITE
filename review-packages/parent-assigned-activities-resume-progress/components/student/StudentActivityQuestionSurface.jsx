import { useEffect, useMemo, useState } from "react";
import StudentQuestionDisplay from "../learning/StudentQuestionDisplay.jsx";
import {
  canStudentActivityQuestionDisplayVertically,
  getStudentActivityVerticalExerciseText,
  normalizeStudentActivityMathLayoutQuestion,
} from "../../lib/classroom-activities/student-activity-question-ui.client.js";
import { STUDENT_ACTIVITY_LAYOUT } from "../../lib/classroom-activities/student-activity-layout.client.js";
import { getQuestionFontStyle } from "../../utils/learning-question-font";

/**
 * Question text inside the unified activity question stage — stable footprint for math toggle.
 *
 * @param {{ question: Record<string, unknown>|null|undefined, questionIndex: number }} props
 */
export default function StudentActivityQuestionSurface({ question, questionIndex }) {
  const [isVerticalDisplay, setIsVerticalDisplay] = useState(false);
  const L = STUDENT_ACTIVITY_LAYOUT;

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
    <div className="relative w-full flex-1 flex flex-col items-center justify-center overflow-visible min-h-[7rem] lg:min-h-[9rem]">
      {canDisplayVertically ? (
        <button
          type="button"
          onClick={() => setIsVerticalDisplay((prev) => !prev)}
          className={L.mathToggle}
          title={isVerticalDisplay ? "הצג מאוזן" : "הצג מאונך"}
          data-testid="activity-math-layout-toggle"
        >
          {isVerticalDisplay ? "↔️ מאוזן" : "↕️ מאונך"}
        </button>
      ) : null}

      <div className="w-full flex flex-col items-center justify-center overflow-visible px-1">
        {isVerticalDisplay && canDisplayVertically && verticalText ? (
          <>
            {layoutQuestion.questionLabel ? (
              <p
                className={L.questionLead}
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
              className="flex justify-center w-full overflow-visible"
              data-testid="student-question-body"
              dir="ltr"
            >
              <pre
                className={`${L.questionFormula} whitespace-pre overflow-visible`}
                style={{
                  direction: "ltr",
                  unicodeBidi: "isolate",
                  ...getQuestionFontStyle({ text: verticalText }),
                }}
              >
                {verticalText}
              </pre>
            </div>
          </>
        ) : (
          <StudentQuestionDisplay
            question={layoutQuestion.question}
            questionLabel={layoutQuestion.questionLabel}
            exerciseText={layoutQuestion.exerciseText || layoutQuestion.question}
            getQuestionFontStyle={getQuestionFontStyle}
            leadClassName={L.questionLead}
            bodyClassName={L.questionBody}
            formulaClassName={L.questionFormula}
            wrapperClassName="w-full flex flex-col items-center justify-center gap-1 overflow-visible"
          />
        )}
      </div>
    </div>
  );
}
