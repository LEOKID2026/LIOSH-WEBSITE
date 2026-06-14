import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import SchoolPortalShell from "../../../components/school-portal/SchoolPortalShell";
import ReportDateRangeControl from "../../../components/reporting/ReportDateRangeControl.jsx";
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
import SchoolStudentDetailsModal from "../../../components/school-portal/SchoolStudentDetailsModal";
import SchoolStudentCreateForm from "../../../components/school-portal/SchoolStudentCreateForm";
import { parseStudentReportViewModel } from "../../../lib/school-portal/school-report-view-model";
import {
  SchoolEmptyState,
  SchoolPrimaryButton,
  SchoolSection,
  SCHOOL_CARD,
  SCHOOL_CARD_INNER,
} from "../../../components/school-portal/SchoolPortalUi";
import { schoolGradeLabelHe, SCHOOL_GRADE_OPTIONS } from "../../../lib/school-portal/school-drilldown";
import { useSchoolDataFetch } from "../../../lib/school-portal/use-school-data-fetch";
import { useSchoolPortalLoad } from "../../../lib/school-portal/use-school-portal-session";
import {
  canBrowseSchoolStudents,
  canManageStudentAccess,
  canViewStudentData,
  getOperatorGrants,
  hasSchoolPortalSession,
  isSchoolManagerPortal,
  operatorHasAnyGrant,
} from "../../../lib/school-portal/operator-grants";
import { SC_BTN_STUDENT_DETAILS } from "../../../lib/school-portal/school-communication.he";
import { fetchSchoolJsonSWR, invalidateSchoolCache, readSchoolCache, deleteSchoolCacheEntry, SCHOOL_CACHE_TTL_MS } from "../../../lib/school-portal/school-portal-cache";
import { fetchSchoolReportCached } from "../../../lib/school-portal/fetch-school-report";
import { useReportDateRange } from "../../../hooks/useReportDateRange";
import { appendReportRangeToSearchParams } from "../../../lib/reporting/report-date-range.js";
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
  SCHOOL_OPERATOR_MANAGE_ACCESS,
  SCHOOL_OPERATOR_VIEW_REPORT,
  SCHOOL_STUDENTS_SUBTITLE,
  SCHOOL_STUDENTS_TITLE,
  SCHOOL_VIEW_STUDENT_REPORT,
  studentLearningStatusBadgeClass,
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
  const { state, accessToken, authMethod, me, schoolId } = useSchoolPortalLoad();
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
  const [modalInitialTab, setModalInitialTab] = useState("report");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsStudent, setDetailsStudent] = useState(null);

  const operatorGrants = getOperatorGrants(me);
  const isManager = isSchoolManagerPortal(me);
  const isOperator = me?.portalRole === "school_operator";
  const canManageAccess = canManageStudentAccess(me);
  const canCreateStudent = canManageAccess;
  const canViewReports = canViewStudentData(me);
  const canManageAssignment = canManageAccess;
  const canViewDetails = canBrowseSchoolStudents(me);
  const canEditDetails = canManageStudentAccess(me);

  useEffect(() => {
    if (state === "unauthenticated") router.replace(isOperator ? "/school/staff/login" : "/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
    if (state === "ready" && isOperator && !operatorHasAnyGrant(me)) {
      router.replace("/school/operator/dashboard");
    }
  }, [state, router, isOperator, me]);

  const loadBrowseSummary = useCallback(async ({ force = false } = {}) => {
    if (!accessToken && authMethod !== "staff_cookie") return;
    const path = "/api/school/students/browse-summary";
    const cached = schoolId ? readSchoolCache(schoolId, path) : null;
    if (cached?.data?.data?.summary && !force) {
      setBrowseSummary(cached.data.data.summary);
      setSummaryLoading(false);
    } else if (!force) {
      setSummaryLoading(true);
    }
    setSummaryError("");
    const applyBrowseResult = (result) => {
      if (!result || result.status !== 200) {
        const body = result?.body || {};
        setBrowseSummary(null);
        if (schoolId) deleteSchoolCacheEntry(schoolId, path);
        setSummaryError(apiErrorMessageHe(body?.error, "שגיאה בטעינת נתונים"));
        return;
      }
      setSummaryError("");
      setBrowseSummary(result.body?.data?.summary || null);
    };
    try {
      const result = await fetchSchoolJsonSWR({
        accessToken,
        schoolId,
        path,
        ttlMs: SCHOOL_CACHE_TTL_MS.browse,
        force,
        fetchFn: schoolAuthFetch,
        onUpdate: (updated) => {
          applyBrowseResult(updated);
          setSummaryLoading(false);
        },
      });
      applyBrowseResult(result);
    } catch {
      setBrowseSummary(null);
      if (schoolId) deleteSchoolCacheEntry(schoolId, path);
      setSummaryError("שגיאה בטעינת נתונים");
    } finally {
      setSummaryLoading(false);
    }
  }, [accessToken, authMethod, schoolId]);

  useEffect(() => {
    if (state === "ready") void loadBrowseSummary();
  }, [state, loadBrowseSummary]);

  const parseBrowseStatus = useMemo(
    () => (body) =>
      body?.data || {
        physicalByKey: {},
        gradeStatusByLevel: {},
        gradeStatus: null,
      },
    []
  );

  const { data: browseStatus } = useSchoolDataFetch(
    accessToken,
    schoolId,
    "/api/school/classes/browse-status",
    parseBrowseStatus,
    state === "ready",
    { cacheKind: "list" }
  );

  const loadClassStudents = useCallback(async ({ force = false } = {}) => {
    if ((!accessToken && authMethod !== "staff_cookie") || !gradeLevel || !physicalClassName) return;
    const q = new URLSearchParams({
      gradeLevel,
      physicalClassName,
    });
    const path = `/api/school/students?${q.toString()}`;
    const cached = schoolId ? readSchoolCache(schoolId, path) : null;
    const cachedStudents = cached?.data?.data?.students;
    const cacheMissingStatusField =
      Array.isArray(cachedStudents) &&
      cachedStudents.length > 0 &&
      !Object.prototype.hasOwnProperty.call(cachedStudents[0], "learningStatusBadge");
    const useCache = cachedStudents && !force && !cacheMissingStatusField;
    if (useCache) {
      setClassStudents(cachedStudents);
      setClassStudentsLoading(false);
    } else if (!force) {
      setClassStudentsLoading(true);
      setClassStudents([]);
    }
    setClassStudentsError("");
    const applyRosterResult = (result) => {
      if (!result || result.status !== 200) {
        const body = result?.body || {};
        setClassStudents([]);
        if (schoolId) deleteSchoolCacheEntry(schoolId, path);
        setClassStudentsError(apiErrorMessageHe(body?.error, "שגיאה בטעינת ילדים"));
        return;
      }
      setClassStudentsError("");
      setClassStudents(result.body?.data?.students || []);
    };
    try {
      const result = await fetchSchoolJsonSWR({
        accessToken,
        schoolId,
        path,
        ttlMs: SCHOOL_CACHE_TTL_MS.browse,
        force,
        fetchFn: schoolAuthFetch,
        onUpdate: (updated) => {
          applyRosterResult(updated);
          setClassStudentsLoading(false);
        },
      });
      applyRosterResult(result);
    } catch {
      setClassStudents([]);
      if (schoolId) deleteSchoolCacheEntry(schoolId, path);
      setClassStudentsError("שגיאה בטעינת ילדים");
    } finally {
      setClassStudentsLoading(false);
    }
  }, [accessToken, authMethod, schoolId, gradeLevel, physicalClassName]);

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

  const reportRange = useReportDateRange();
  const reportStudentRef = useRef(null);

  const fetchStudentReport = useCallback(
    async (student, { force = false, range = null } = {}) => {
      if (!hasSchoolPortalSession(accessToken, authMethod) || !canViewReports || !student?.studentId) {
        return;
      }
      reportStudentRef.current = student;
      const params =
        range != null
          ? appendReportRangeToSearchParams(new URLSearchParams(), range)
          : reportRange.buildSearchParams();
      const ctxGrade = student?.gradeLevel || gradeLevel;
      const ctxPhysical = student?.physicalClassName || physicalClassName;
      if (ctxGrade) params.set("gradeLevel", String(ctxGrade));
      if (ctxPhysical) params.set("physicalClassName", String(ctxPhysical));
      const path = `/api/school/students/${student.studentId}/report-data?${params.toString()}`;

      setReportLoading(true);
      setReportError("");
      try {
        const result = await fetchSchoolReportCached({
          accessToken,
          schoolId,
          path,
          force,
        });
        if (result?.status !== 200) {
          setReportError(apiErrorMessageHe(result?.body?.error, "שגיאה בטעינת דוח"));
          setReportViewModel(null);
          return;
        }
        setReportViewModel(
          parseStudentReportViewModel(result.body, student, { schoolName: me?.school?.name })
        );
      } finally {
        setReportLoading(false);
      }
    },
    [
      accessToken,
      authMethod,
      canViewReports,
      gradeLevel,
      physicalClassName,
      me?.school?.name,
      reportRange,
      schoolId,
    ]
  );

  const refetchStudentReportForRange = useCallback(
    (range = null) => {
      const student = reportStudentRef.current;
      if (student && reportOpen) {
        void fetchStudentReport(student, { force: true, range });
      }
    },
    [fetchStudentReport, reportOpen]
  );

  const reportRangeControl = (
    <ReportDateRangeControl
      presetDays={reportRange.presetDays}
      customDates={reportRange.customDates}
      startDate={reportRange.startDate}
      endDate={reportRange.endDate}
      onStartDateChange={reportRange.setStartDate}
      onEndDateChange={reportRange.setEndDate}
      rangeLabel={reportRange.rangeLabel}
      disabled={reportLoading}
      showSchoolYearPreset
      onPreset={(days) => {
        const range = reportRange.applyPreset(days);
        refetchStudentReportForRange(range);
      }}
      onSchoolYearPreset={() => {
        const range = reportRange.applySchoolYearPreset();
        refetchStudentReportForRange(range);
      }}
      onEnableCustom={() => reportRange.setCustomDates(true)}
      onApplyCustom={() => {
        const result = reportRange.applyCustom();
        if (!result.ok) {
          alert("אנא בחר תאריכים תקינים");
          return;
        }
        refetchStudentReportForRange({ from: result.from, to: result.to });
      }}
    />
  );

  const openStudentReport = async (student) => {
    if (!hasSchoolPortalSession(accessToken, authMethod) || !canViewReports) return;
    setModalInitialTab("report");
    setReportStudent(student);
    reportStudentRef.current = student;
    setReportOpen(true);
    setReportError("");
    setReportViewModel(null);
    await fetchStudentReport(student);
  };

  const openStudentAccess = (student) => {
    if (!canManageAccess || !hasSchoolPortalSession(accessToken, authMethod)) return;
    setModalInitialTab("access");
    setReportStudent(student);
    setReportOpen(true);
    setReportError("");
    setReportViewModel(null);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsStudent(null);
  };

  const openStudentDetails = (student) => {
    if (!canViewDetails || !hasSchoolPortalSession(accessToken, authMethod)) return;
    setDetailsStudent(student);
    setDetailsOpen(true);
  };

  const handleDetailsNameChange = (newName) => {
    if (!detailsStudent) return;
    setDetailsStudent((prev) => (prev ? { ...prev, displayName: newName } : prev));
    setClassStudents((prev) =>
      prev.map((s) => (s.studentId === detailsStudent.studentId ? { ...s, displayName: newName } : s))
    );
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
        portalRole={me?.portalRole || "school_manager"}
        authMethod={authMethod}
        operatorGrants={operatorGrants}
      >
        {state === "loading" ? (
          <SchoolLoadingBlock message={SCHOOL_LOADING} />
        ) : (
          <div className="space-y-6">
            {canCreateStudent ? (
              <SchoolStudentCreateForm
                accessToken={accessToken}
                authMethod={authMethod}
                browseSummary={browseSummary}
                onSuccess={() => {
                  if (schoolId) invalidateSchoolCache(schoolId);
                  void loadBrowseSummary({ force: true });
                  if (gradeLevel && physicalClassName) void loadClassStudents({ force: true });
                }}
              />
            ) : null}

            {isManager ? (
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
            ) : null}

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
                              count != null ? `${count} ילדים` : summaryLoading ? "…" : "0 ילדים"
                            }
                            gradeStatusLabel={
                              canViewReports ? browseStatus?.gradeStatusByLevel?.[grade.level] || null : null
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
                      {physicalGroups.map((group) => {
                        const physKey = `${gradeLevel}::${String(group.name || "").trim()}`;
                        return (
                          <SchoolManagementCard
                            key={group.name}
                            title={group.name}
                            subtitle={`${group.studentCount} ילדים`}
                            classStatusLabel={
                              canViewReports ? browseStatus?.physicalByKey?.[physKey] || null : null
                            }
                            onClick={() => setPhysicalClassName(group.name)}
                          />
                        );
                      })}
                    </SchoolCardGrid>
                  ) : (
                    <SchoolEmptyState title="אין ילדים בשכבה זו." />
                  )}
                </SchoolSection>
              </>
            ) : null}

            {gradeLevel && physicalClassName ? (
              <>
                <SchoolBackButton label={SCHOOL_BACK_CLASSES} onClick={() => setPhysicalClassName("")} />
                <SchoolSection title={`${SCHOOL_CHOOSE_STUDENTS} · ${physicalClassName}`}>
                  {(() => {
                    if (!canViewReports) return null;
                    const classStatus = browseStatus?.physicalByKey?.[`${gradeLevel}::${physicalClassName}`];
                    if (!classStatus) return null;
                    return (
                      <p className="text-sm mb-3 text-right" data-testid="school-students-class-browse-status">
                        <span
                          className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border leading-snug ${studentLearningStatusBadgeClass(
                            classStatus
                          )}`}
                        >
                          מצב כיתה: {classStatus}
                        </span>
                      </p>
                    );
                  })()}
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
                          accessLabel={SCHOOL_OPERATOR_MANAGE_ACCESS}
                          learningStatusBadge={canViewReports ? s.learningStatusBadge || null : null}
                          onReport={
                            canViewReports && hasSchoolPortalSession(accessToken, authMethod)
                              ? () => void openStudentReport(s)
                              : undefined
                          }
                          onAccess={
                            canManageAccess && hasSchoolPortalSession(accessToken, authMethod)
                              ? () => openStudentAccess(s)
                              : undefined
                          }
                          onDetails={
                            canViewDetails && hasSchoolPortalSession(accessToken, authMethod)
                              ? () => openStudentDetails(s)
                              : undefined
                          }
                          detailsLabel={SC_BTN_STUDENT_DETAILS}
                        />
                      ))}
                    </SchoolCardGrid>
                  ) : (
                    <SchoolEmptyState title="לא נמצאו ילדים בכיתה זו." />
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
              accessToken={accessToken}
              authMethod={authMethod}
              studentId={reportStudent?.studentId}
              studentName={reportStudent?.displayName}
              canManageAssignment={canManageAssignment}
              canManageAccess={canManageAccess}
              canViewReport={canViewReports}
              initialTab={modalInitialTab}
              onAssignmentUpdated={() => void loadBrowseSummary({ force: true })}
              rangeControl={reportRangeControl}
            />

            <SchoolStudentDetailsModal
              open={detailsOpen}
              onClose={closeDetails}
              accessToken={accessToken}
              authMethod={authMethod}
              studentId={detailsStudent?.studentId || ""}
              studentName={detailsStudent?.displayName || ""}
              gradeLevel={detailsStudent?.gradeLevel || gradeLevel}
              physicalClassName={detailsStudent?.physicalClassName || physicalClassName}
              canEdit={canEditDetails}
              onStudentNameChange={handleDetailsNameChange}
            />
          </div>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
