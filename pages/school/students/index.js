import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import SchoolPortalShell from "../../../components/school-portal/SchoolPortalShell";
import {
  SchoolBackButton,
  SchoolCardGrid,
  SchoolDrillBreadcrumb,
  SchoolErrorBlock,
  SchoolLoadingBlock,
  SchoolManagementCard,
  SchoolStudentCard,
} from "../../../components/school-portal/SchoolDrillDown";
import {
  SchoolEmptyState,
  SchoolPrimaryButton,
  SchoolReportPreview,
  SchoolSection,
  SCHOOL_CARD,
  SCHOOL_CARD_INNER,
} from "../../../components/school-portal/SchoolPortalUi";
import {
  filterStudentsByPhysicalClass,
  groupPhysicalClassesForStudents,
  schoolGradeLabelHe,
  SCHOOL_GRADE_OPTIONS,
} from "../../../lib/school-portal/school-drilldown";
import { useSchoolDataFetch } from "../../../lib/school-portal/use-school-data-fetch";
import { useSchoolPortalLoad } from "../../../lib/school-portal/use-school-portal-session";
import {
  schoolAuthFetch,
  schoolStudentReportSummaryFromBody,
  SCHOOL_BACK_CLASSES,
  SCHOOL_BACK_GRADES,
  SCHOOL_CHOOSE_GRADE,
  SCHOOL_CHOOSE_PHYSICAL_CLASS,
  SCHOOL_CHOOSE_STUDENTS,
  SCHOOL_EMPTY_STUDENTS,
  SCHOOL_EMPTY_STUDENTS_HINT,
  SCHOOL_ENROLL_SECTION,
  SCHOOL_ENROLL_STUDENT,
  SCHOOL_LOADING,
  SCHOOL_REPORT_CLOSE,
  SCHOOL_REPORT_LOADING,
  SCHOOL_SEARCH_STUDENTS,
  SCHOOL_SEARCH_STUDENTS_PLACEHOLDER,
  SCHOOL_STUDENT_ID,
  SCHOOL_STUDENTS_SUBTITLE,
  SCHOOL_STUDENTS_TITLE,
  SCHOOL_VIEW_STUDENT_REPORT,
} from "../../../lib/school-portal/school-ui.he";

export default function SchoolStudentsPage() {
  const router = useRouter();
  const { state, accessToken, me } = useSchoolPortalLoad();
  const [gradeLevel, setGradeLevel] = useState("");
  const [physicalClassName, setPhysicalClassName] = useState("");
  const [search, setSearch] = useState("");
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [reportStudentId, setReportStudentId] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportSummary, setReportSummary] = useState(null);

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
  }, [state, router]);

  const parseStudents = useMemo(() => (body) => body?.data?.students || [], []);

  const { data: students, loading, error, reload } = useSchoolDataFetch(
    accessToken,
    "/api/school/students",
    parseStudents,
    state === "ready"
  );

  const physicalGroups = useMemo(
    () => (gradeLevel ? groupPhysicalClassesForStudents(students || [], gradeLevel) : []),
    [students, gradeLevel]
  );

  const visibleStudents = useMemo(() => {
    let rows = students || [];
    if (gradeLevel) {
      rows = filterStudentsByPhysicalClass(rows, gradeLevel, physicalClassName || null);
    }
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((s) => String(s.displayName || "").toLowerCase().includes(q));
  }, [students, gradeLevel, physicalClassName, search]);

  const enroll = async (e) => {
    e.preventDefault();
    if (!accessToken) return;
    setBusy(true);
    try {
      const res = await schoolAuthFetch(accessToken, "/api/school/students", {
        method: "POST",
        body: JSON.stringify({ studentId: studentId.trim() }),
      });
      if (res.status === 201) {
        setStudentId("");
        await reload();
      }
    } finally {
      setBusy(false);
    }
  };

  const openStudentReport = async (student) => {
    if (!accessToken) return;
    setReportStudentId(student.studentId);
    setReportLoading(true);
    setReportError("");
    setReportSummary(null);
    try {
      const res = await schoolAuthFetch(
        accessToken,
        `/api/school/students/${student.studentId}/report-data?windowDays=30`
      );
      const body = await res.json().catch(() => ({}));
      if (res.status !== 200) {
        setReportError(body?.error?.message || body?.error?.code || "שגיאה בטעינת דוח");
        return;
      }
      const name = student.displayName || student.studentId;
      setReportSummary(
        schoolStudentReportSummaryFromBody(body, name, student.physicalClassName || student.gradeLevel)
      );
    } finally {
      setReportLoading(false);
    }
  };

  const breadcrumbSteps = [
    { label: SCHOOL_CHOOSE_GRADE, onClick: gradeLevel ? () => { setGradeLevel(""); setPhysicalClassName(""); } : undefined, active: !gradeLevel },
    gradeLevel
      ? {
          label: schoolGradeLabelHe(gradeLevel),
          onClick: physicalClassName ? () => setPhysicalClassName("") : undefined,
          active: gradeLevel && !physicalClassName,
        }
      : null,
    physicalClassName ? { label: physicalClassName, active: true } : null,
  ].filter(Boolean);

  return (
    <Layout>
      <SchoolPortalShell
        title={SCHOOL_STUDENTS_TITLE}
        subtitle={SCHOOL_STUDENTS_SUBTITLE}
        schoolName={me?.school?.name}
        showTeacherDashboardLink={me?.hasTeacherActivity}
      >
        {state === "loading" ? (
          <SchoolLoadingBlock message={SCHOOL_LOADING} />
        ) : loading ? (
          <SchoolLoadingBlock />
        ) : error ? (
          <SchoolErrorBlock message={error} onRetry={() => void reload()} />
        ) : (
          <div className="space-y-6">
            <div className={`${SCHOOL_CARD} ${SCHOOL_CARD_INNER} text-right`}>
              <button
                type="button"
                onClick={() => setShowEnroll((v) => !v)}
                className="text-sm text-amber-300 hover:underline"
              >
                {showEnroll ? "הסתר רישום מתקדם" : SCHOOL_ENROLL_SECTION}
              </button>
              {showEnroll ? (
                <form onSubmit={enroll} className="space-y-3 max-w-xl mt-3">
                  <label className="block text-sm text-white/70">
                    {SCHOOL_STUDENT_ID}
                    <input
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required
                      className="mt-1 w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 font-mono text-sm"
                    />
                  </label>
                  <SchoolPrimaryButton disabled={busy} type="submit">
                    {busy ? "רושם…" : SCHOOL_ENROLL_STUDENT}
                  </SchoolPrimaryButton>
                </form>
              ) : null}
            </div>

            <SchoolDrillBreadcrumb steps={breadcrumbSteps} />

            {!gradeLevel ? (
              <SchoolSection title={SCHOOL_CHOOSE_GRADE}>
                {!students?.length ? (
                  <SchoolEmptyState title={SCHOOL_EMPTY_STUDENTS} hint={SCHOOL_EMPTY_STUDENTS_HINT} />
                ) : (
                  <SchoolCardGrid columns={3}>
                    {SCHOOL_GRADE_OPTIONS.map((grade) => {
                      const count = (students || []).filter(
                        (s) => String(s.gradeLevel || "").trim() === grade.level
                      ).length;
                      return (
                        <SchoolManagementCard
                          key={grade.level}
                          title={grade.label}
                          subtitle={`${count} תלמידים`}
                          onClick={() => setGradeLevel(grade.level)}
                        />
                      );
                    })}
                  </SchoolCardGrid>
                )}
              </SchoolSection>
            ) : null}

            {gradeLevel && !physicalClassName ? (
              <>
                <SchoolBackButton
                  label={SCHOOL_BACK_GRADES}
                  onClick={() => {
                    setGradeLevel("");
                    setPhysicalClassName("");
                  }}
                />
                <SchoolSection title={`${SCHOOL_CHOOSE_PHYSICAL_CLASS} · ${schoolGradeLabelHe(gradeLevel)}`}>
                  {physicalGroups.length ? (
                    <SchoolCardGrid columns={2}>
                      {physicalGroups.map((group) => (
                        <SchoolManagementCard
                          key={group.name}
                          title={group.name}
                          subtitle={`${group.studentCount} תלמידים`}
                          onClick={() => setPhysicalClassName(group.name)}
                        />
                      ))}
                    </SchoolCardGrid>
                  ) : (
                    <SchoolEmptyState title="אין תלמידים בשכבה זו." />
                  )}
                </SchoolSection>
              </>
            ) : null}

            {gradeLevel && physicalClassName ? (
              <>
                <SchoolBackButton label={SCHOOL_BACK_CLASSES} onClick={() => setPhysicalClassName("")} />
                <SchoolSection title={`${SCHOOL_CHOOSE_STUDENTS} · ${physicalClassName}`}>
                  <div className="mb-4">
                    <label className="block text-sm text-white/70 text-right">
                      {SCHOOL_SEARCH_STUDENTS}
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="mt-1 w-full max-w-md mr-0 ml-auto block rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-sm"
                        placeholder={SCHOOL_SEARCH_STUDENTS_PLACEHOLDER}
                      />
                    </label>
                  </div>
                  {visibleStudents.length ? (
                    <SchoolCardGrid columns={1}>
                      {visibleStudents.map((s) => (
                        <SchoolStudentCard
                          key={s.studentId}
                          student={s}
                          gradeLabel={schoolGradeLabelHe(s.gradeLevel)}
                          reportLabel={SCHOOL_VIEW_STUDENT_REPORT}
                          onReport={() => void openStudentReport(s)}
                        />
                      ))}
                    </SchoolCardGrid>
                  ) : (
                    <SchoolEmptyState title="לא נמצאו תלמידים בכיתה זו." />
                  )}
                </SchoolSection>
              </>
            ) : null}

            {reportStudentId ? (
              <SchoolReportPreview
                loading={reportLoading ? SCHOOL_REPORT_LOADING : null}
                error={reportError}
                summary={reportSummary}
                onClose={() => {
                  setReportStudentId(null);
                  setReportSummary(null);
                  setReportError("");
                }}
                closeLabel={SCHOOL_REPORT_CLOSE}
              />
            ) : null}
          </div>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
