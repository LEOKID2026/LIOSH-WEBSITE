import { useMemo } from "react";
import GeometryExplanationDiagram from "../learning/geometry/GeometryExplanationDiagram";
import StudentActivityQuestionSurface from "./StudentActivityQuestionSurface";
import { getGeometryDiagramSpec } from "../../utils/geometry-diagram-spec";
import { useStudentActivityUi } from "../../hooks/useStudentActivityUi.js";

/**
 * Question stage: stem first, then geometry-master mini diagram in document flow
 * (no absolute overlay — keeps activity answer layout stable).
 *
 * @param {{
 *   question: Record<string, unknown>|null|undefined,
 *   questionIndex: number,
 *   hideLayoutToggle?: boolean,
 *   onVerticalExerciseHeadlineChange?: (headline: string|null) => void,
 *   onExpandDiagram?: () => void,
 * }} props
 */
export default function StudentAssignedActivityQuestionStage({
  question,
  questionIndex,
  hideLayoutToggle = false,
  onVerticalExerciseHeadlineChange,
  onExpandDiagram,
}) {
  const { L } = useStudentActivityUi();

  const questionDiagramSpec = useMemo(() => {
    if (!question || question.subject !== "geometry") return null;
    return getGeometryDiagramSpec(question, { hideUnknownValues: true });
  }, [question]);

  if (!question) return null;

  return (
    <div className={L.questionStageInner}>
      <StudentActivityQuestionSurface
        question={question}
        questionIndex={questionIndex}
        hideLayoutToggle={hideLayoutToggle}
        onVerticalExerciseHeadlineChange={onVerticalExerciseHeadlineChange}
      />
      {questionDiagramSpec ? (
        <div
          className="w-full shrink-0 flex justify-center"
          data-testid="geometry-question-diagram"
          dir="ltr"
        >
          <div
            role="button"
            tabIndex={0}
            aria-label="הגדל שרטוט"
            onClick={() => onExpandDiagram?.()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onExpandDiagram?.();
              }
            }}
            className="relative inline-block max-w-full cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
          >
            <GeometryExplanationDiagram
              spec={questionDiagramSpec}
              mini
              question={question}
              emphasis="neutral"
            />
            <span
              className="absolute bottom-0.5 left-0.5 text-[10px] leading-none bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 rounded px-1.5 py-px shadow pointer-events-none select-none"
              aria-hidden
            >
              ⛶ הגדל
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
