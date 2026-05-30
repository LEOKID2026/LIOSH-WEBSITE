import ClassroomGeometryQuestionDiagram from "./ClassroomGeometryQuestionDiagram";
import StudentActivityQuestionSurface from "./StudentActivityQuestionSurface";
import { STUDENT_ACTIVITY_LAYOUT } from "../../lib/classroom-activities/student-activity-layout.client.js";

/**
 * Unified visual column: geometry diagram (if any) + question text in one stable stage.
 *
 * @param {{ question: Record<string, unknown>|null|undefined, questionIndex: number }} props
 */
export default function StudentAssignedActivityQuestionStage({ question, questionIndex }) {
  if (!question) return null;

  const isGeometry = question.subject === "geometry";

  return (
    <div className={STUDENT_ACTIVITY_LAYOUT.questionStageInner}>
      {isGeometry ? (
        <div className="w-full shrink-0 flex justify-center">
          <ClassroomGeometryQuestionDiagram question={question} embedded />
        </div>
      ) : null}
      <StudentActivityQuestionSurface question={question} questionIndex={questionIndex} />
    </div>
  );
}
