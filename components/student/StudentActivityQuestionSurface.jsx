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
import { useStudentActivityUi } from "../../hooks/useStudentActivityUi.js";
import { hasStackedFractionToken } from "../../utils/math-fraction-expression-parse.js";
import {
  isMathFractionsQuestionStem,
  MATH_FRACTIONS_QUESTION_STEM_SIZE_CLASS,
  shouldHideFractionsMcqTrailingBlank,
  stripRedundantTrailingAnswerBlank,
} from "../../utils/math-fraction-question-display.js";
import { assignedActivityQuestionUsesChoiceUi } from "../../utils/geometry-activity-answer-ui.js";
import { renderMaybeStackedFractionText } from "../learning/MathFractionExpression.jsx";

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
  const { L } = useStudentActivityUi();

  const layoutQuestion = useMemo(
    () => normalizeStudentActivityMathLayoutQuestion(question),
    [question]
  );

  const isFractionsStem = useMemo(
    () => isMathFractionsQuestionStem(layoutQuestion || question),
    [layoutQuestion, question]
  );

  const hideFractionsMcqBlank = useMemo(
    () =>
      shouldHideFractionsMcqTrailingBlank(layoutQuestion || question, {
        usesChoiceUi: assignedActivityQuestionUsesChoiceUi(question),
      }),
    [layoutQuestion, question]
  );

  const displayLayoutQuestion = useMemo(() => {
    if (!layoutQuestion) return null;
    if (!hideFractionsMcqBlank) return layoutQuestion;
    return {
      ...layoutQuestion,
      question: stripRedundantTrailingAnswerBlank(layoutQuestion.question),
      exerciseText: stripRedundantTrailingAnswerBlank(layoutQuestion.exerciseText),
    };
  }, [layoutQuestion, hideFractionsMcqBlank]);

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
        question: displayLayoutQuestion?.question,
        questionLabel: displayLayoutQuestion?.questionLabel,
        exerciseText:
          displayLayoutQuestion?.exerciseText || displayLayoutQuestion?.question,
      }),
    [displayLayoutQuestion]
  );

  const fractionsStemSizeClass = isFractionsStem
    ? MATH_FRACTIONS_QUESTION_STEM_SIZE_CLASS
    : "";

  const stackedFractions = Boolean(
    isFractionsStem ||
      hasStackedFractionToken(
        displayLayoutQuestion?.exerciseText ||
          displayLayoutQuestion?.question ||
          ""
      )
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

  const isGeometryActivity =
    String(question?.subject || "").trim().toLowerCase() === "geometry";

  if (!displayLayoutQuestion) return null;

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
                {stackedFractions
                  ? renderMaybeStackedFractionText(displayParts.leadText)
                  : displayParts.leadText}
              </p>
            ) : null}
            <div
              className="flex justify-center w-full overflow-visible"
              data-testid="student-question-body"
              dir="ltr"
            >
              <pre
                className={`${L.questionFormula} whitespace-pre overflow-visible${fractionsStemSizeClass}`}
                style={{
                  direction: "ltr",
                  unicodeBidi: "isolate",
                  ...getStudentActivityQuestionFontStyle({ text: verticalText }),
                }}
              >
                {stackedFractions
                  ? renderMaybeStackedFractionText(verticalText)
                  : verticalText}
              </pre>
            </div>
          </>
        ) : (
          <StudentQuestionDisplay
            question={displayLayoutQuestion.question}
            questionLabel={displayLayoutQuestion.questionLabel}
            exerciseText={
              displayLayoutQuestion.exerciseText || displayLayoutQuestion.question
            }
            stackedFractions={stackedFractions}
            plainVerbalFinalQuestion={isGeometryActivity}
            getQuestionFontStyle={getStudentActivityQuestionFontStyle}
            getEquationFontStyle={getStudentActivityEquationFontStyle}
            leadClassName={L.questionLead}
            bodyClassName={`${L.questionBody}${fractionsStemSizeClass}`}
            formulaClassName={`${L.questionFormula}${fractionsStemSizeClass}`}
            wrapperClassName="w-full flex flex-col items-center justify-center gap-1 overflow-visible"
          />
        )}
      </div>
    </div>
  );
}
