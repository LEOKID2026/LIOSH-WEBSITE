import { schoolSubjectLabelHe, SCHOOL_VIEW_CLASS_REPORT, SCHOOL_STUDENTS_IN_CLASS } from "../../lib/school-portal/school-ui.he.js";
import { SCHOOL_CARD, SCHOOL_CARD_INNER } from "./SchoolPortalUi.jsx";

/**
 * Subject picker when a teacher teaches multiple subjects in one physical class.
 *
 * @param {{
 *   open: boolean,
 *   physicalClassName: string,
 *   subjectClasses: Array<{ classId: string, subjectFocus?: string|null, memberCount?: number, activityCount?: number }>,
 *   onClose: () => void,
 *   onClassReport: (cls: object) => void,
 *   onClassStudents: (cls: object) => void,
 * }} props
 */
export default function SchoolTeacherPhysicalClassPickerModal({
  open,
  physicalClassName,
  subjectClasses,
  onClose,
  onClassReport,
  onClassStudents,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="school-teacher-subject-picker-title"
      data-testid="school-teacher-subject-picker-modal"
    >
      <div className={`${SCHOOL_CARD} w-full max-w-lg max-h-[85vh] overflow-y-auto text-right`}>
        <div className={`${SCHOOL_CARD_INNER} space-y-4`}>
          <div className="flex items-start justify-between gap-3">
            <h2 id="school-teacher-subject-picker-title" className="text-lg font-semibold text-white">
              {physicalClassName}
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

          <ul className="space-y-3">
            {subjectClasses.map((cls) => (
              <li
                key={cls.classId}
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-3 space-y-2"
              >
                <p className="font-medium text-white">{schoolSubjectLabelHe(cls.subjectFocus)}</p>
                <p className="text-sm text-white/55">
                  {cls.memberCount ?? 0} {SCHOOL_STUDENTS_IN_CLASS}
                  {cls.activityCount != null ? ` · ${cls.activityCount} פעילויות` : ""}
                </p>
                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => onClassReport(cls)}
                    className="rounded-lg border border-white/25 bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs font-semibold"
                  >
                    {SCHOOL_VIEW_CLASS_REPORT}
                  </button>
                  <button
                    type="button"
                    onClick={() => onClassStudents(cls)}
                    className="rounded-lg border border-white/25 bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs font-semibold"
                  >
                    {SCHOOL_STUDENTS_IN_CLASS}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
