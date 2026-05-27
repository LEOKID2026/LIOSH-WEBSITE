import { useCallback, useEffect, useMemo, useState } from "react";
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
import SchoolReportModal from "../../../components/school-portal/SchoolReportModal";
import { parseStudentReportViewModel } from "../../../lib/school-portal/school-report-view-model";
import {
  SchoolEmptyState,
  SchoolPrimaryButton,
  SchoolSection,
  SCHOOL_CARD,
  SCHOOL_CARD_INNER,
} from "../../../components/school-portal/SchoolPortalUi";
import { schoolGradeLabelHe, SCHOOL_GRADE_OPTIONS } from "../../../lib/school-portal/school-drilldown";
import { useSchoolPortalLoad } from "../../../lib/school-portal/use-school-portal-session";
import { fetchSchoolJsonSWR, invalidateSchoolCache, readSchoolCache, SCHOOL_CACHE_TTL_MS } from "../../../lib/school-portal/school-portal-cache";
import { fetchSchoolReportCached } from "../../../lib/school-portal/fetch-school-report";
import {
  apiErrorMessageHe,
  schoolAuthFetch,
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
  SCHOOL_LOADING_DATA,
  SCHOOL_REPORT_LOADING,
  SCHOOL_SEARCH_STUDENTS,
  SCHOOL_SEARCH_STUDENTS_PLACEHOLDER,
  SCHOOL_STUDENT_ID,
  SCHOOL_STUDENT_REPORT_TITLE,
  SCHOOL_STUDENTS_SUBTITLE,
  SCHOOL_STUDENTS_TITLE,
  SCHOOL_VIEW_STUDENT_REPORT,
} from "../../../lib/school-portal/school-ui.he";

function gradeCountMap(summary) {
  const map = new Map();
  for (const row of summary?.grades || []) {
    map.set(String(row.gradeLevel), row.studentCount);
  }
  return map;
}

export default function SchoolStudentsPage() {
  const router = useRouter();
  const { state, accessToken, me, schoolId } = useSchoolPortalLoad();
  const [gradeLevel, setGradeLevel] = useState("");
  const [physicalClassName, setPhysicalClassName] = useState("");
  const [search, setSearch] = useState("");
  const [studentId, setStudentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);

  const [browseSummary, setBrowseSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const [classStudents, setClassStudents] = useState([]);
  const [classStudentsLoading, setClassStudentsLoading] = useState(false);
  const [classStudentsError, setClassStudentsError] = useState("");

  const [reportOpen, setReportOpen] = useState(false);
  const [reportStudent, setReportStudent] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportViewModel, setReportViewModel] = useState(null);

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
  }, [state, router]);

  const loadBrowseSummary = useCallback(async ({ force = false } = {}) => {
    if (!accessToken) return;
    const path = "/api/school/students/browse-summary";
    const cached = schoolId ? readSchoolCache(schoolId, path) : null;
    if (cached?.data?.data?.summary) {
      setBrowseSummary(cached.data.data.summary);
      setSummaryLoading(false);
    } else {
      setSummaryLoading(true);
    }
    setSummaryError("");
    try {
      const result = await fetchSchoolJsonSWR({
        accessToken,
        schoolId,
        path,
        ttlMs: SCHOOL_CACHE_TTL_MS.browse,
        force,
        fetchFn: schoolAuthFetch,
        onUpdate: (updated) => {
          if (updated.status === 200) {
            setBrowseSummary(updated.body?.data?.summary || null);
          }
        },
      });
      if (!result || result.status !== 200) {
        const body = result?.body || {};
        setSummaryError(apiErrorMessageHe(body?.error, "שגיאה בטעינת נתונים"));
        return;
      }
      setBrowseSummary(result.body?.data?.summary || null);
    } catch {
      setSummaryError("שגיאה בטעינת נתונים");
    } finally {
      setSummaryLoading(false);
    }
  }, [accessToken, schoolId]);

  useEffect(() => {
    if (state === "ready") void loadBrowseSummary();
  }, [state, loadBrowseSummary]);

  const loadClassStudents = useCallback(async ({ force = false } = {}) => {
    if (!accessToken || !gradeLevel || !physicalClassName) return;
    const q = new URLSearchParams({
      gradeLevel,
      physicalClassName,
    });
    const path = `/api/school/students?${q.toString()}`;
    const cached = schoolId ? readSchoolCache(schoolId, path) : null;
    if (cached?.data?.data?.students && !force) {
      setClassStudents(cached.data.data.students);
      setClassStudentsLoading(false);
    } else {
      setClassStudentsLoading(true);
      setClassStudents([]);
    }
    setClassStudentsError("");
    try {
      const result = await fetchSchoolJsonSWR({
        accessToken,
        schoolId,
        path,
        ttlMs: SCHOOL_CACHE_TTL_MS.browse,
        force,
        fetchFn: schoolAuthFetch,
        onUpdate: (updated) => {
          if (updated.status === 200) {
            setClassStudents(updated.body?.data?.students || []);
          }
        },
      });
      if (!result || result.status !== 200) {
        const body = result?.body || {};
        setClassStudentsError(apiErrorMessageHe(body?.error, "שגיאה בטעינת תלמידים"));
        return;
      }
      setClassStudents(result.body?.data?.students || []);
    } catch {
      setClassStudentsError("שגיאה בטעינת תלמידים");
    } finally {
      setClassStudentsLoading(false);
    }
  }, [accessToken, schoolId, gradeLevel, physicalClassName]);

  useEffect(() => {
    if (gradeLevel && physicalClassName) void loadClassStudents();
  }, [gradeLevel, physicalClassName, loadClassStudents]);

  useEffect(() => {
    setReportOpen(false);
    setReportStudent(null);
    setReportError("");
    setReportViewModel(null);
  }, [gradeLevel, physicalClassName]);

  const countsByGrade = useMemo(() => gradeCountMap(browseSummary), [browseSummary]);

  const physicalGroups = useMemo(() => {
    if (!gradeLevel || !browseSummary?.physicalClassesByGrade) return [];
    return browseSummary.physicalClassesByGrade[gradeLevel] || [];
  }, [browseSummary, gradeLevel]);

  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classStudents;
    return classStudents.filter((s) => String(s.displayName || "").toLowerCase().includes(q));
  }, [classStudents, search]);

  const closeReport = () => {
    setReportOpen(false);
    setReportStudent(null);
    setReportError("");
    setReportViewModel(null);
  };

  const openStudentReport = async (student) => {
    if (!accessToken) return;
    setReportStudent(student);
    setReportOpen(true);
    setReportError("");
    setReportViewModel(null);
    const params = new URLSearchParams({ windowDays: "30" });
    const ctxGrade = student?.gradeLevel || gradeLevel;
    const ctxPhysical = student?.physicalClassName || physicalClassName;
    if (ctxGrade) params.set("gradeLevel", String(ctxGrade));
    if (ctxPhysical) params.set("physicalClassName", String(ctxPhysical));
    const path = `/api/school/students/${student.studentId}/report-data?${params.toString()}`;

    const applyBody = (body) => {
      setReportViewModel(parseStudentReportViewModel(body, student, { schoolName: me?.school?.name }));
    };

    setReportLoading(true);
    try {
      const result = await fetchSchoolReportCached({
        accessToken,
        schoolId,
        path,
      });
      if (result?.status !== 200) {
        setReportError(apiErrorMessageHe(result?.body?.error, "שגיאה בטעינת דוח"));
        return;
      }
      applyBody(result.body);
    } finally {
      setReportLoading(false);
    }
  };

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
        if (schoolId) invalidateSchoolCache(schoolId);
        await loadBrowseSummary({ force: true });
        if (gradeLevel && physicalClassName) await loadClassStudents({ force: true });
      }
    } finally {
      setBusy(false);
    }
  };

  const breadcrumbSteps = [
    {
      label: SCHOOL_CHOOSE_GRADE,
      onClick: gradeLevel ? () => { setGradeLevel(""); setPhysicalClassName(""); } : undefined,
      active: !gradeLevel,
    },
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
                {summaryError ? (
                  <SchoolErrorBlock message={summaryError} onRetry={() => void loadBrowseSummary()} />
                ) : (
                  <>
                    {summaryLoading ? (
                      <p className="text-xs text-white/45 mb-3 text-right">{SCHOOL_LOADING_DATA}</p>
                    ) : null}
                    <SchoolCardGrid columns={3}>
                      {SCHOOL_GRADE_OPTIONS.map((grade) => {
                        const count = countsByGrade.get(grade.level);
                        return (
                          <SchoolManagementCard
                            key={grade.level}
                            title={grade.label}
                            subtitle={
                              count != null ? `${count} תלמידים` : summaryLoading ? "…" : "0 תלמידים"
                            }
                            onClick={() => setGradeLevel(grade.level)}
                          />
                        );
                      })}
                    </SchoolCardGrid>
                    {!summaryLoading && browseSummary?.totalStudents === 0 ? (
                      <SchoolEmptyState title={SCHOOL_EMPTY_STUDENTS} hint={SCHOOL_EMPTY_STUDENTS_HINT} />
                    ) : null}
                  </>
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
                  {summaryLoading ? (
                    <SchoolLoadingBlock message={SCHOOL_LOADING_DATA} />
                  ) : physicalGroups.length ? (
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
                  {classStudentsLoading ? (
                    <SchoolLoadingBlock message={SCHOOL_LOADING_DATA} />
                  ) : classStudentsError ? (
                    <SchoolErrorBlock message={classStudentsError} onRetry={() => void loadClassStudents()} />
                  ) : visibleStudents.length ? (
                    <SchoolCardGrid columns={2}>
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

            <SchoolReportModal
              open={reportOpen}
              title={SCHOOL_STUDENT_REPORT_TITLE}
              onClose={closeReport}
              loading={reportLoading}
              loadingLabel={SCHOOL_REPORT_LOADING}
              error={reportError}
              viewModel={reportViewModel}
            />
          </div>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
