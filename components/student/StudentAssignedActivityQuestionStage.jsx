import ClassroomGeometryQuestionDiagram from "./ClassroomGeometryQuestionDiagram";
import StudentActivityQuestionSurface from "./StudentActivityQuestionSurface";
import { useStudentActivityUi } from "../../hooks/useStudentActivityUi.js";

/**
 * Unified visual column: geometry diagram (if any) + question text in one stable stage.
 *
 * @param {{
 *   question: Record<string, unknown>|null|undefined,
 *   questionIndex: number,
 *   hideLayoutToggle?: boolean,
 *   onVerticalExerciseHeadlineChange?: (headline: string|null) => void,
 * }} props
 */
export default function StudentAssignedActivityQuestionStage({
  question,
  questionIndex,
  hideLayoutToggle = false,
  onVerticalExerciseHeadlineChange,
}) {
  const { L } = useStudentActivityUi();

  if (!question) return null;

  const isGeometry = question.subject === "geometry";

  return (
    <div className={L.questionStageInner}>
      {isGeometry ? (
        <div className="w-full shrink-0 flex justify-center">
          <ClassroomGeometryQuestionDiagram question={question} embedded />
        </div>
      ) : null}
      <StudentActivityQuestionSurface
        question={question}
        questionIndex={questionIndex}
        hideLayoutToggle={hideLayoutToggle}
        onVerticalExerciseHeadlineChange={onVerticalExerciseHeadlineChange}
      />
    </div>
  );
}
