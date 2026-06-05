import { useEffect, useMemo, useState } from "react";
import StudentQuestionDisplay from "../learning/StudentQuestionDisplay.jsx";
import { resolveStudentQuestionDisplayParts } from "../../utils/student-question-display.js";
import {
  canStudentActivityQuestionDisplayVertically,
  getStudentActivityEquationFontStyle,
  getStudentActivityQuestionFontStyle,
  getStudentActivityVerticalExerciseText,
  normalizeStudentActivityMathLayoutQuestion,
} from "../../lib/classroom-activities/student-activity-question-ui.client.js";
import { STUDENT_ACTIVITY_LAYOUT } from "../../lib/classroom-activities/student-activity-layout.client.js";

/**
 * Question text inside the unified activity question stage — stable footprint for math toggle.
 *
 * @param {{ question: Record<string, unknown>|null|undefined, questionIndex: number, hideLayoutToggle?: boolean, onVerticalExerciseHeadlineChange?: (headline: string|null) => void }} props
 */
export default function StudentActivityQuestionSurface({
  question,
  questionIndex,
  hideLayoutToggle = false,
  onVerticalExerciseHeadlineChange,
}) {
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

  const displayParts = useMemo(
    () =>
      resolveStudentQuestionDisplayParts({
        question: layoutQuestion?.question,
        questionLabel: layoutQuestion?.questionLabel,
        exerciseText: layoutQuestion?.exerciseText || layoutQuestion?.question,
      }),
    [layoutQuestion]
  );

  useEffect(() => {
    setIsVerticalDisplay(false);
  }, [questionIndex]);

  useEffect(() => {
    if (typeof onVerticalExerciseHeadlineChange !== "function") return;
    if (isVerticalDisplay && canDisplayVertically && verticalText) {
      onVerticalExerciseHeadlineChange(verticalText);
    } else {
      onVerticalExerciseHeadlineChange(null);
    }
  }, [
    isVerticalDisplay,
    canDisplayVertically,
    verticalText,
    onVerticalExerciseHeadlineChange,
  ]);

  if (!layoutQuestion) return null;

  return (
    <div
      className={
        canDisplayVertically ? L.mathVerticalQuestionSurface : "relative w-full flex flex-col items-center justify-center overflow-visible"
      }
    >
      {canDisplayVertically && !hideLayoutToggle ? (
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

      <div
        className={
          canDisplayVertically
            ? L.mathVerticalExerciseSlot
            : "w-full flex flex-col items-center justify-center overflow-visible px-1"
        }
      >
        {isVerticalDisplay && canDisplayVertically && verticalText ? (
          <>
            {displayParts.leadText ? (
              <p
                className={L.questionLead}
                dir="rtl"
                data-testid="student-question-lead"
                style={{
                  direction: "rtl",
                  unicodeBidi: "plaintext",
                  ...getStudentActivityQuestionFontStyle({
                    text: displayParts.leadText,
                    kind: "label",
                  }),
                }}
              >
                {displayParts.leadText}
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
                  ...getStudentActivityQuestionFontStyle({ text: verticalText }),
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
            getQuestionFontStyle={getStudentActivityQuestionFontStyle}
            getEquationFontStyle={getStudentActivityEquationFontStyle}
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
