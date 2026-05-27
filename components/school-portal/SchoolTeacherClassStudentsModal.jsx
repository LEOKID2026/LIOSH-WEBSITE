import {
  SchoolCardGrid,
  SchoolLoadingBlock,
  SchoolStudentCard,
} from "./SchoolDrillDown.jsx";
import { schoolGradeLabelHe } from "../../lib/school-portal/school-drilldown.js";
import { SCHOOL_VIEW_STUDENT_REPORT } from "../../lib/school-portal/school-ui.he.js";
import { SchoolEmptyState, SCHOOL_CARD, SCHOOL_CARD_INNER } from "./SchoolPortalUi.jsx";

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
}) {
  if (!open) return null;

  const gradeLabel = schoolGradeLabelHe(gradeLevel);

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center p-4 bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="school-teacher-class-students-title"
      data-testid="school-teacher-class-students-modal"
    >
      <div className={`${SCHOOL_CARD} w-full max-w-lg max-h-[85vh] overflow-y-auto text-right`}>
        <div className={`${SCHOOL_CARD_INNER} space-y-4`}>
          <div className="flex items-start justify-between gap-3">
            <h2 id="school-teacher-class-students-title" className="text-lg font-semibold text-white">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-white/60 hover:text-white shrink-0"
              aria-label="סגירה"
            >
              ✕
            </button>
          </div>

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
            <SchoolEmptyState title="אין תלמידים בכיתה זו." />
          ) : null}
        </div>
      </div>
    </div>
  );
}
