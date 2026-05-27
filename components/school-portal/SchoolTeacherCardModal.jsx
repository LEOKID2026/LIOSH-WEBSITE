import { ReportModalFrame } from "../reporting/ReportModalFrame.jsx";
import {
  schoolSubjectLabelHe,
  SCHOOL_COL_CLASSES,
  SCHOOL_COL_STUDENTS,
  SCHOOL_LOADING,
  SCHOOL_ROLE_MANAGER,
  SCHOOL_ROLE_TEACHER,
  SCHOOL_TEACHER_CARD_ACTION,
} from "../../lib/school-portal/school-ui.he.js";

function roleLabelHe(role, isSchoolManager) {
  if (isSchoolManager) return SCHOOL_ROLE_MANAGER;
  if (role === "school_manager") return SCHOOL_ROLE_MANAGER;
  return SCHOOL_ROLE_TEACHER;
}

/**
 * In-report teacher summary card (no page navigation).
 */
export default function SchoolTeacherCardModal({
  open,
  onClose,
  subtitle,
  loading = false,
  error = "",
  teacher = null,
  physicalClassSubjects = [],
  zIndex = 320,
}) {
  const displayName = teacher?.displayName || "מורה/ה";

  return (
    <ReportModalFrame
      open={open}
      title={SCHOOL_TEACHER_CARD_ACTION}
      subtitle={subtitle || displayName}
      onClose={onClose}
      closeLabel="סגירה"
      zIndex={zIndex}
      testId="school-teacher-card-modal"
    >
      {loading ? (
        <p className="text-white/60 text-sm py-8 text-center">{SCHOOL_LOADING}</p>
      ) : null}
      {!loading && error ? (
        <p className="text-red-300 text-sm py-4" role="alert">
          {error}
        </p>
      ) : null}
      {!loading && !error && teacher ? (
        <div className="space-y-4 text-sm" data-testid="school-teacher-card-ready">
          <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-3">
            <p className="text-lg font-bold text-white mb-1">{displayName}</p>
            <p className="text-white/55">
              תפקיד: {roleLabelHe(teacher.role, teacher.isSchoolManager)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-center">
              <p className="text-[11px] text-white/45">{SCHOOL_COL_STUDENTS}</p>
              <p className="text-base font-bold text-amber-200 tabular-nums">
                {teacher.activeStudentLinkCount ?? "—"}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-center">
              <p className="text-[11px] text-white/45">{SCHOOL_COL_CLASSES}</p>
              <p className="text-base font-bold text-amber-200 tabular-nums">
                {teacher.activeClassCount ?? "—"}
              </p>
            </div>
          </div>
          {Array.isArray(teacher.subjects) && teacher.subjects.length > 0 ? (
            <div>
              <p className="text-xs text-white/45 mb-2">מקצועות מורשים בבית הספר</p>
              <p className="text-white/85 leading-relaxed">
                {teacher.subjects.map((s) => schoolSubjectLabelHe(s)).filter(Boolean).join(" · ")}
              </p>
            </div>
          ) : null}
          {physicalClassSubjects.length > 0 ? (
            <div>
              <p className="text-xs text-white/45 mb-2">מקצועות בכיתה זו</p>
              <ul className="space-y-1">
                {physicalClassSubjects.map((label) => (
                  <li key={label} className="text-white/85">
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </ReportModalFrame>
  );
}
