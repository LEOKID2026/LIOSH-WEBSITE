import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReportHubModal from "../reporting/ReportHubModal.jsx";
import ReportDateRangeControl from "../reporting/ReportDateRangeControl.jsx";
import { parseClassReportViewModel } from "../../lib/school-portal/school-report-view-model.js";
import { parseStudentReportViewModel } from "../../lib/school-portal/school-report-view-model.js";
import { teacherAuthFetch } from "../../lib/teacher-portal/teacher-ui.he.js";
import { useReportDateRange } from "../../hooks/useReportDateRange.js";
import { appendReportRangeToSearchParams } from "../../lib/reporting/report-date-range.js";

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

  const reportRange = useReportDateRange();
  const activeClassIdRef = useRef(activeClassId);
  const nestedStudentContextRef = useRef(null);
  activeClassIdRef.current = activeClassId;

  const activeSubject = subjects.find((s) => s.classId === activeClassId) || subjects[0];

  const buildRangeParams = useCallback(
    (range = null, extra = {}) => {
      const params =
        range != null
          ? appendReportRangeToSearchParams(new URLSearchParams(), range)
          : reportRange.buildSearchParams();
      for (const [key, value] of Object.entries(extra)) {
        if (value != null && String(value).trim()) params.set(key, String(value));
      }
      return params;
    },
    [reportRange]
  );

  const loadClassReport = useCallback(
    async ({ forceRange = null } = {}) => {
      const classId = activeClassIdRef.current || subjects[0]?.classId;
      if (!classId || !accessToken) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      setViewModel(null);
      try {
        const params = buildRangeParams(forceRange);
        const res = await teacherAuthFetch(
          accessToken,
          `/api/teacher/classes/${encodeURIComponent(classId)}/report-data?${params.toString()}`
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
    },
    [accessToken, activeSubject, buildRangeParams, classCard, subjects]
  );

  useEffect(() => {
    setActiveClassId(subjects[0]?.classId || "");
  }, [classCard, subjects]);

  useEffect(() => {
    void loadClassReport();
  }, [loadClassReport]);

  const openStudentReport = async (studentId, row, { range = null } = {}) => {
    if (!studentId || !accessToken) return;
    nestedStudentContextRef.current = { studentId, row };
    setStudentLoading(true);
    try {
      const classId = activeClassIdRef.current || subjects[0]?.classId;
      const params = buildRangeParams(range, classId ? { classId: String(classId) } : {});
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
        "ילד/ה";
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

  const refetchForRange = useCallback(
    (range) => {
      if (nestedStudentVm && nestedStudentContextRef.current) {
        const { studentId, row } = nestedStudentContextRef.current;
        void openStudentReport(studentId, row, { range });
        return;
      }
      void loadClassReport({ forceRange: range });
    },
    [loadClassReport, nestedStudentVm]
  );

  const rangeControl = useMemo(
    () => (
      <ReportDateRangeControl
        presetDays={reportRange.presetDays}
        customDates={reportRange.customDates}
        startDate={reportRange.startDate}
        endDate={reportRange.endDate}
        onStartDateChange={reportRange.setStartDate}
        onEndDateChange={reportRange.setEndDate}
        rangeLabel={reportRange.rangeLabel}
        disabled={loading || studentLoading}
        onPreset={(days) => {
          const nextRange = reportRange.applyPreset(days);
          refetchForRange(nextRange);
        }}
        onEnableCustom={() => reportRange.setCustomDates(true)}
        onApplyCustom={() => {
          const result = reportRange.applyCustom();
          if (!result.ok) {
            alert("אנא בחר תאריכים תקינים");
            return;
          }
          refetchForRange({ from: result.from, to: result.to });
        }}
      />
    ),
    [loading, refetchForRange, reportRange, studentLoading]
  );

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
        onCloseStudentReport={() => {
          setNestedStudentVm(null);
          nestedStudentContextRef.current = null;
        }}
        rangeControl={rangeControl}
      />
    </>
  );
}
