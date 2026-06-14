import {
  SchoolCardGrid,
  SchoolLoadingBlock,
  SchoolStudentCard,
} from "./SchoolDrillDown.jsx";
import { ReportModalFrame } from "../reporting/ReportModalFrame.jsx";
import { schoolGradeLabelHe } from "../../lib/school-portal/school-drilldown.js";
import { SCHOOL_VIEW_STUDENT_REPORT } from "../../lib/school-portal/school-ui.he.js";
import { SchoolEmptyState, SCHOOL_PORTAL_MODAL_SCROLL_CLASS } from "./SchoolPortalUi.jsx";

/**
 * Roster for a subject class opened from teacher detail.
 *
 * @param {{
 *   open: boolean,
 *   title: string,
 *   loading: boolean,
 *   error: string,
 *   students: Array<{ studentId: string, displayName?: string|null, gradeLevel?: string|null, physicalClassName?: string|null }>,
 *   gradeLevel: string,
 *   onClose: () => void,
 *   onStudentReport: (student: object) => void,
 *   zIndex?: number,
 * }} props
 */
export default function SchoolTeacherClassStudentsModal({
  open,
  title,
  loading,
  error,
  students,
  gradeLevel,
  onClose,
  onStudentReport,
  zIndex = 110,
}) {
  const gradeLabel = schoolGradeLabelHe(gradeLevel);

  return (
    <ReportModalFrame
      open={open}
      title={title}
      onClose={onClose}
      testId="school-teacher-class-students-modal"
      zIndex={zIndex}
      scrollAreaClassName={SCHOOL_PORTAL_MODAL_SCROLL_CLASS}
    >
      {loading ? <SchoolLoadingBlock /> : null}
      {error ? (
        <p className="text-red-300 text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && students.length ? (
        <SchoolCardGrid columns={1}>
          {students.map((s) => (
            <SchoolStudentCard
              key={s.studentId}
              student={s}
              gradeLabel={gradeLabel}
              reportLabel={SCHOOL_VIEW_STUDENT_REPORT}
              onReport={() => onStudentReport(s)}
            />
          ))}
        </SchoolCardGrid>
      ) : null}
      {!loading && !error && !students.length ? (
        <SchoolEmptyState title="אין ילדים בכיתה זו." />
      ) : null}
    </ReportModalFrame>
  );
}
