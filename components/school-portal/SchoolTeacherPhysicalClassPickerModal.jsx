import { ReportModalFrame } from "../reporting/ReportModalFrame.jsx";
import { SCHOOL_PORTAL_MODAL_SCROLL_CLASS } from "./SchoolPortalUi";
import { schoolSubjectLabelHe, SCHOOL_VIEW_CLASS_REPORT, SCHOOL_STUDENTS_IN_CLASS } from "../../lib/school-portal/school-ui.he.js";

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
  zIndex = 100,
}) {
  return (
    <ReportModalFrame
      open={open}
      title={physicalClassName}
      onClose={onClose}
      testId="school-teacher-subject-picker-modal"
      zIndex={zIndex}
      scrollAreaClassName={SCHOOL_PORTAL_MODAL_SCROLL_CLASS}
    >
      <ul className="space-y-3">
        {subjectClasses.map((cls) => (
          <li
            key={cls.classId}
            className="rounded-lg border border-white/10 bg-black/25 px-3 py-3 space-y-2"
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
                className="rounded-lg bg-amber-500/90 hover:bg-amber-400 text-black text-sm font-bold px-3 py-1.5"
              >
                {SCHOOL_VIEW_CLASS_REPORT}
              </button>
              <button
                type="button"
                onClick={() => onClassStudents(cls)}
                className="rounded-lg border border-white/25 bg-white/5 hover:bg-white/15 px-3 py-1.5 text-sm font-semibold text-white"
              >
                {SCHOOL_STUDENTS_IN_CLASS}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </ReportModalFrame>
  );
}
