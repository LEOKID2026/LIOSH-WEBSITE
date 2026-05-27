import { useCallback, useEffect, useState } from "react";
import ReportHubModal from "../reporting/ReportHubModal.jsx";
import { parseClassReportViewModel } from "../../lib/school-portal/school-report-view-model.js";
import { parseStudentReportViewModel } from "../../lib/school-portal/school-report-view-model.js";
import { teacherAuthFetch } from "../../lib/teacher-portal/teacher-ui.he.js";

/**
 * In-dashboard class report hub (summary-first, same UX as school manager).
 */
export default function TeacherClassReportModal({
  accessToken,
  classCard,
  onClose,
}) {
  const subjects = classCard?.subjectClassIds || [];
  const [activeClassId, setActiveClassId] = useState(subjects[0]?.classId || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewModel, setViewModel] = useState(null);
  const [nestedStudentVm, setNestedStudentVm] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);

  const activeSubject = subjects.find((s) => s.classId === activeClassId) || subjects[0];

  const loadClassReport = useCallback(async () => {
    const classId = activeClassId || subjects[0]?.classId;
    if (!classId || !accessToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setViewModel(null);
    try {
      const res = await teacherAuthFetch(
        accessToken,
        `/api/teacher/classes/${encodeURIComponent(classId)}/report-data?windowDays=30`
      );
      const body = await res.json().catch(() => ({}));
      if (res.status !== 200) {
        setError(body?.error?.message || "שגיאה בטעינת דוח");
        return;
      }
      const cls = body?.class || {};
      setViewModel(
        parseClassReportViewModel(
          body,
          {
            classId,
            name: classCard?.name || cls.name,
            gradeLevel: classCard?.gradeLevel || cls.gradeLevel,
            subjectFocus: activeSubject?.subjectFocus || cls.subjectFocus,
            teacherName: null,
            memberCount: classCard?.studentCount,
            activityCount: classCard?.activityCount,
          },
          {}
        )
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeClassId, activeSubject, classCard, subjects]);

  useEffect(() => {
    setActiveClassId(subjects[0]?.classId || "");
  }, [classCard, subjects]);

  useEffect(() => {
    void loadClassReport();
  }, [loadClassReport]);

  const openStudentReport = async (studentId, row) => {
    if (!studentId || !accessToken) return;
    setStudentLoading(true);
    try {
      const classId = activeClassId || subjects[0]?.classId;
      const params = new URLSearchParams({ windowDays: "30" });
      if (classId) params.set("classId", String(classId));
      const res = await teacherAuthFetch(
        accessToken,
        `/api/teacher/students/${encodeURIComponent(studentId)}/report-data?${params.toString()}`
      );
      const body = await res.json().catch(() => ({}));
      if (res.status !== 200) return;
      const displayName =
        row?.name ||
        body?.student?.full_name ||
        viewModel?.sections?.students?.items?.find((i) => i.studentId === studentId)?.name ||
        "תלמיד/ה";
      setNestedStudentVm(
        parseStudentReportViewModel(
          body,
          {
            studentId,
            displayName,
            physicalClassName: classCard?.name,
            gradeLevel: classCard?.gradeLevel,
          },
          { subjectFocus: activeSubject?.subjectFocus }
        )
      );
    } finally {
      setStudentLoading(false);
    }
  };

  const subtitle =
    subjects.length > 1 && activeSubject?.subjectLabel
      ? `${classCard?.name || "דוח כיתה"} · ${activeSubject.subjectLabel}`
      : classCard?.name || "דוח כיתה";

  void subtitle;

  return (
    <>
      {subjects.length > 1 ? (
        <div className="fixed inset-0 z-[99] pointer-events-none flex items-end sm:items-start justify-center p-4 sm:pt-20">
          <div className="pointer-events-auto flex flex-wrap gap-2 justify-center max-w-2xl">
            {subjects.map((s) => (
              <button
                key={s.classId}
                type="button"
                onClick={() => setActiveClassId(s.classId)}
                className={`text-sm px-3 py-1.5 rounded-full border shadow-lg ${
                  activeClassId === s.classId
                    ? "bg-amber-500 text-black border-amber-400 font-semibold"
                    : "bg-gray-900/95 text-white/80 border-white/20"
                }`}
                data-testid={`teacher-report-subject-tab-${s.classId}`}
              >
                {s.subjectLabel}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <ReportHubModal
        open
        title="דוח כיתה"
        onClose={onClose}
        loading={loading}
        loadingLabel="טוען דוח כיתה…"
        error={error}
        viewModel={viewModel}
        onStudentReport={openStudentReport}
        studentReportLoading={studentLoading}
        nestedStudentViewModel={nestedStudentVm}
        onCloseStudentReport={() => setNestedStudentVm(null)}
      />
    </>
  );
}
