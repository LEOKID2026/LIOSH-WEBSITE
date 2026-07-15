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
  SchoolSubjectClassCard,
} from "../../../components/school-portal/SchoolDrillDown";
import SchoolReportModal from "../../../components/school-portal/SchoolReportModal";
import SchoolTeacherDetailModal from "../../../components/school-portal/SchoolTeacherDetailModal";
import { parseClassReportViewModel, parsePhysicalClassReportViewModel, parseStudentReportViewModel } from "../../../lib/school-portal/school-report-view-model";
import { SchoolEmptyState, SchoolSection } from "../../../components/school-portal/SchoolPortalUi";
import {
  groupPhysicalClassesForGrade,
  physicalClassGroupKey,
  physicalClassStudentCount,
  schoolGradeLabelHe,
  sortSubjectClasses,
  SCHOOL_GRADE_OPTIONS,
} from "../../../lib/school-portal/school-drilldown";
import { useSchoolDataFetch } from "../../../lib/school-portal/use-school-data-fetch";
import { useSchoolPortalLoad } from "../../../lib/school-portal/use-school-portal-session";
import { fetchSchoolReportCached } from "../../../lib/school-portal/fetch-school-report";
import { useReportDateRange } from "../../../hooks/useReportDateRange";
import { appendReportRangeToSearchParams } from "../../../lib/reporting/report-date-range.js";
import {
  apiErrorMessageHe,
  SCHOOL_BACK_CLASSES,
  SCHOOL_BACK_GRADES,
  SCHOOL_CHOOSE_GRADE,
  SCHOOL_CHOOSE_PHYSICAL_CLASS,
  SCHOOL_CHOOSE_SUBJECT,
  SCHOOL_CLASS_REPORT_TITLE,
  SCHOOL_CLASSES_SUBTITLE,
  SCHOOL_CLASSES_TITLE,
  SCHOOL_EMPTY_CLASSES,
  SCHOOL_LOADING,
  SCHOOL_LOADING_DATA,
  SCHOOL_REPORT_LOADING,
  SCHOOL_STUDENTS_IN_CLASS,
  SCHOOL_PHYSICAL_CLASS_LOADING,
  SCHOOL_PHYSICAL_CLASS_REPORT_BUTTON,
  SCHOOL_PHYSICAL_CLASS_REPORT_TITLE,
  SCHOOL_VIEW_CLASS_REPORT,
  studentLearningStatusBadgeClass,
} from "../../../lib/school-portal/school-ui.he";

/** Stacked subject-class report must sit above physical report detail (z 110). */
const REPORT_STACK_SUBJECT_OVER_PHYSICAL = 150;
/** Teacher detail modal above stacked subject report (max z 280). */
const REPORT_STACK_TEACHER_DETAIL = 320;
const REPORT_STACK_TEACHER_DETAIL_NESTED = 350;

export default function SchoolClassesPage() {
  const router = useRouter();
  const { state, accessToken, me, schoolId } = useSchoolPortalLoad();
  const [gradeLevel, setGradeLevel] = useState("");
  const [physicalKey, setPhysicalKey] = useState("");

  const [reportOpen, setReportOpen] = useState(false);
  const [reportClass, setReportClass] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportViewModel, setReportViewModel] = useState(null);
  const [nestedStudentVm, setNestedStudentVm] = useState(null);
  const [studentReportLoading, setStudentReportLoading] = useState(false);
  const reportClassRef = useRef(null);

  const [physicalReportOpen, setPhysicalReportOpen] = useState(false);
  const [physicalReportLoading, setPhysicalReportLoading] = useState(false);
  const [physicalReportError, setPhysicalReportError] = useState("");
  const [physicalReportVm, setPhysicalReportVm] = useState(null);
  const [physicalReportContext, setPhysicalReportContext] = useState(null);
  const [physicalNestedStudentVm, setPhysicalNestedStudentVm] = useState(null);
  const [physicalStudentReportLoading, setPhysicalStudentReportLoading] = useState(false);

  const canManageAssignment =
    me?.portalRole === "school_manager" || me?.grants?.studentAccessAdmin === true;

  const [subjectFromPhysicalOpen, setSubjectFromPhysicalOpen] = useState(false);
  const [subjectFromPhysicalLoading, setSubjectFromPhysicalLoading] = useState(false);
  const [subjectFromPhysicalError, setSubjectFromPhysicalError] = useState("");
  const [subjectFromPhysicalVm, setSubjectFromPhysicalVm] = useState(null);
  const [subjectFromPhysicalClass, setSubjectFromPhysicalClass] = useState(null);
  const [subjectFromPhysicalNestedStudentVm, setSubjectFromPhysicalNestedStudentVm] = useState(null);
  const [subjectFromPhysicalStudentLoading, setSubjectFromPhysicalStudentLoading] = useState(false);
  const subjectFromPhysicalClassRef = useRef(null);

  const [teacherDetailOpen, setTeacherDetailOpen] = useState(false);
  const [teacherDetailId, setTeacherDetailId] = useState(null);

  const reportRange = useReportDateRange();
  /** @type {React.MutableRefObject<((range: { from: string, to: string } | null) => void) | null>} */
  const activeRangeRefetchRef = useRef(null);

  const refetchActiveReportForRange = useCallback((range = null) => {
    activeRangeRefetchRef.current?.(range);
  }, []);

  const reportRangeControl = (
    <ReportDateRangeControl
      presetDays={reportRange.presetDays}
      customDates={reportRange.customDates}
      startDate={reportRange.startDate}
      endDate={reportRange.endDate}
      onStartDateChange={reportRange.setStartDate}
      onEndDateChange={reportRange.setEndDate}
      rangeLabel={reportRange.rangeLabel}
      disabled={
        reportLoading ||
        physicalReportLoading ||
        subjectFromPhysicalLoading ||
        studentReportLoading ||
        physicalStudentReportLoading ||
        subjectFromPhysicalStudentLoading
      }
      showSchoolYearPreset
      onPreset={(days) => {
        const nextRange = reportRange.applyPreset(days);
        refetchActiveReportForRange(nextRange);
      }}
      onSchoolYearPreset={() => {
        const nextRange = reportRange.applySchoolYearPreset();
        refetchActiveReportForRange(nextRange);
      }}
      onEnableCustom={() => reportRange.setCustomDates(true)}
      onApplyCustom={() => {
        const result = reportRange.applyCustom();
        if (!result.ok) {
          alert("אנא בחר תאריכים תקינים");
          return;
        }
        refetchActiveReportForRange({ from: result.from, to: result.to });
      }}
    />
  );

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
  }, [state, router]);

  const parseClasses = useMemo(
    () => (body) => body?.data?.classes?.filter((c) => !c.isArchived) || [],
    []
  );

  const { data: classes, loading, error, reload } = useSchoolDataFetch(
    accessToken,
    schoolId,
    "/api/school/classes",
    parseClasses,
    state === "ready",
    { cacheKind: "list" }
  );

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
    state === "ready" && Boolean(classes?.length),
    { cacheKind: "list" }
  );

  useEffect(() => {
    reportClassRef.current = null;
    setReportOpen(false);
    setReportClass(null);
    setReportError("");
    setReportViewModel(null);
    setNestedStudentVm(null);
    setPhysicalReportOpen(false);
    setPhysicalReportError("");
    setPhysicalReportVm(null);
    setPhysicalReportContext(null);
    setPhysicalNestedStudentVm(null);
    setSubjectFromPhysicalOpen(false);
    setSubjectFromPhysicalError("");
    setSubjectFromPhysicalVm(null);
    setSubjectFromPhysicalClass(null);
    setSubjectFromPhysicalNestedStudentVm(null);
    subjectFromPhysicalClassRef.current = null;
    setTeacherDetailOpen(false);
    setTeacherDetailId(null);
  }, [gradeLevel, physicalKey]);

  const physicalGroups = useMemo(
    () => (gradeLevel && classes ? groupPhysicalClassesForGrade(classes, gradeLevel) : []),
    [classes, gradeLevel]
  );

  const gradePhysicalCounts = useMemo(() => {
    const map = new Map();
    if (!classes) return map;
    for (const grade of SCHOOL_GRADE_OPTIONS) {
      map.set(grade.level, groupPhysicalClassesForGrade(classes, grade.level).length);
    }
    return map;
  }, [classes]);

  const selectedPhysical = useMemo(
    () => physicalGroups.find((g) => physicalClassGroupKey(g.subjectClasses[0]) === physicalKey) || null,
    [physicalGroups, physicalKey]
  );

  const subjectClasses = useMemo(
    () => (selectedPhysical ? sortSubjectClasses(selectedPhysical.subjectClasses) : []),
    [selectedPhysical]
  );

  const closeReport = () => {
    reportClassRef.current = null;
    setReportOpen(false);
    setReportClass(null);
    setReportError("");
    setReportViewModel(null);
    setNestedStudentVm(null);
  };

  const closePhysicalReport = () => {
    setPhysicalReportOpen(false);
    setPhysicalReportError("");
    setPhysicalReportVm(null);
    setPhysicalReportContext(null);
    setPhysicalNestedStudentVm(null);
    closeSubjectFromPhysical();
    closeTeacherDetail();
  };

  const closeTeacherDetail = () => {
    setTeacherDetailOpen(false);
    setTeacherDetailId(null);
  };

  const closeSubjectFromPhysical = () => {
    subjectFromPhysicalClassRef.current = null;
    setSubjectFromPhysicalOpen(false);
    setSubjectFromPhysicalError("");
    setSubjectFromPhysicalVm(null);
    setSubjectFromPhysicalClass(null);
    setSubjectFromPhysicalNestedStudentVm(null);
  };

  const openTeacherDetailFromPhysical = (teacherId) => {
    if (!teacherId) return;
    closeSubjectFromPhysical();
    setTeacherDetailId(teacherId);
    setTeacherDetailOpen(true);
  };

  const handlePhysicalRowAction = (action, _item) => {
    if (action.id === "subject_report" || action.id === "open_subject_report") {
      closeTeacherDetail();
      const cls =
        subjectClasses.find((c) => c.classId === action.classId) ||
        (action.classId
          ? {
              classId: action.classId,
              name: physicalReportContext?.name,
              gradeLevel: physicalReportContext?.gradeLevel,
            }
          : null);
      if (cls) void openSubjectReportFromPhysical(cls);
      return;
    }
    if (action.id === "teacher_card" && action.teacherId) {
      openTeacherDetailFromPhysical(action.teacherId);
    }
  };

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

  const openStudentReportFromPhysical = async (studentId, row, { force = false, range = null } = {}) => {
    if (!accessToken || !studentId || !physicalReportContext) return;
    const params = buildRangeParams(range, {
      gradeLevel: String(physicalReportContext.gradeLevel),
      physicalClassName: String(physicalReportContext.name),
    });
    const path = `/api/school/students/${studentId}/report-data?${params.toString()}`;

    activeRangeRefetchRef.current = (r) => {
      void openStudentReportFromPhysical(studentId, row, { force: true, range: r });
    };

    const applyBody = (body) => {
      const displayName =
        row?.name ||
        body?.student?.full_name ||
        physicalReportVm?.sections?.students?.items?.find((i) => i.studentId === studentId)?.name ||
        "ילד/ה";
      setPhysicalNestedStudentVm(
        parseStudentReportViewModel(
          body,
          {
            studentId,
            displayName,
            physicalClassName: physicalReportContext.name,
            gradeLevel: physicalReportContext.gradeLevel,
          },
          { schoolName: me?.school?.name }
        )
      );
    };

    setPhysicalStudentReportLoading(true);
    try {
      const result = await fetchSchoolReportCached({ accessToken, schoolId, path, force });
      if (result?.status === 200) applyBody(result.body);
    } finally {
      setPhysicalStudentReportLoading(false);
    }
  };

  const openStudentReportFromSubjectPhysical = async (studentId, row, { force = false, range = null } = {}) => {
    if (!accessToken || !studentId) return;
    const ctxClass = subjectFromPhysicalClassRef.current || subjectFromPhysicalClass;
    const extra = {};
    if (ctxClass?.classId) extra.classId = String(ctxClass.classId);
    const params = buildRangeParams(range, extra);
    const path = `/api/school/students/${studentId}/report-data?${params.toString()}`;

    activeRangeRefetchRef.current = (r) => {
      void openStudentReportFromSubjectPhysical(studentId, row, { force: true, range: r });
    };

    const applyBody = (body) => {
      const displayName =
        row?.name ||
        body?.student?.full_name ||
        subjectFromPhysicalVm?.sections?.students?.items?.find((i) => i.studentId === studentId)?.name ||
        "ילד/ה";
      setSubjectFromPhysicalNestedStudentVm(
        parseStudentReportViewModel(
          body,
          {
            studentId,
            displayName,
            physicalClassName: ctxClass?.name,
            gradeLevel: ctxClass?.gradeLevel,
          },
          {
            schoolName: me?.school?.name,
            subjectFocus: ctxClass?.subjectFocus,
          }
        )
      );
    };

    setSubjectFromPhysicalStudentLoading(true);
    try {
      const result = await fetchSchoolReportCached({ accessToken, schoolId, path, force });
      if (result?.status === 200) applyBody(result.body);
    } finally {
      setSubjectFromPhysicalStudentLoading(false);
    }
  };

  const openPhysicalClassReport = async (physicalGroup, { force = false, range = null } = {}) => {
    if (!accessToken || !physicalGroup) return;
    setPhysicalReportContext({
      name: physicalGroup.name,
      gradeLevel,
    });
    setPhysicalReportOpen(true);
    setPhysicalReportError("");
    setPhysicalReportVm(null);
    setPhysicalNestedStudentVm(null);
    setPhysicalReportLoading(true);

    activeRangeRefetchRef.current = (r) => {
      void openPhysicalClassReport(physicalGroup, { force: true, range: r });
    };

    const baseParams = buildRangeParams(range, {
      gradeLevel: String(gradeLevel),
      physicalClassName: physicalGroup.name,
    });

    const parseCtx = {
      schoolName: me?.school?.name,
      gradeLevel,
      physicalClassName: physicalGroup.name,
    };

    const summaryParams = new URLSearchParams(baseParams);
    summaryParams.set("loadPhase", "summary");
    const summaryPath = `/api/school/classes/physical-report?${summaryParams.toString()}`;

    try {
      const summaryResult = await fetchSchoolReportCached({
        accessToken,
        schoolId,
        path: summaryPath,
        force,
      });
      if (summaryResult?.status !== 200) {
        setPhysicalReportError(apiErrorMessageHe(summaryResult?.body?.error, "שגיאה בטעינת דוח"));
        return;
      }
      setPhysicalReportVm(parsePhysicalClassReportViewModel(summaryResult.body, parseCtx));
      setPhysicalReportLoading(false);

      const fullParams = new URLSearchParams(baseParams);
      fullParams.set("loadPhase", "full");
      const fullPath = `/api/school/classes/physical-report?${fullParams.toString()}`;
      const fullResult = await fetchSchoolReportCached({
        accessToken,
        schoolId,
        path: fullPath,
        force,
      });
      if (fullResult?.status === 200) {
        setPhysicalReportVm(parsePhysicalClassReportViewModel(fullResult.body, parseCtx));
      }
    } catch {
      setPhysicalReportError("שגיאה בטעינת דוח");
    } finally {
      setPhysicalReportLoading(false);
    }
  };

  const openSubjectReportFromPhysical = async (cls, { force = false, range = null } = {}) => {
    if (!accessToken || !cls?.classId) return;
    subjectFromPhysicalClassRef.current = cls;
    setSubjectFromPhysicalClass(cls);
    setSubjectFromPhysicalOpen(true);
    setSubjectFromPhysicalError("");
    setSubjectFromPhysicalVm(null);
    setSubjectFromPhysicalNestedStudentVm(null);
    setSubjectFromPhysicalLoading(true);

    activeRangeRefetchRef.current = (r) => {
      void openSubjectReportFromPhysical(cls, { force: true, range: r });
    };

    const params = buildRangeParams(range);
    const path = `/api/school/classes/${cls.classId}/report-data?${params.toString()}`;

    try {
      const result = await fetchSchoolReportCached({ accessToken, schoolId, path, force });
      if (result?.status !== 200) {
        setSubjectFromPhysicalError(apiErrorMessageHe(result?.body?.error, "שגיאה בטעינת דוח"));
        return;
      }
      setSubjectFromPhysicalVm(
        parseClassReportViewModel(result.body, { ...cls, classId: cls.classId }, result.body.schoolManagerExtras || {})
      );
    } finally {
      setSubjectFromPhysicalLoading(false);
    }
  };

  const openStudentReportFromClass = async (studentId, row, { force = false, range = null } = {}) => {
    if (!accessToken || !studentId) return;
    const ctxClass = reportClassRef.current || reportClass;
    const extra = {};
    if (ctxClass?.classId) extra.classId = String(ctxClass.classId);
    const params = buildRangeParams(range, extra);
    const path = `/api/school/students/${studentId}/report-data?${params.toString()}`;

    activeRangeRefetchRef.current = (r) => {
      void openStudentReportFromClass(studentId, row, { force: true, range: r });
    };

    const applyBody = (body) => {
      const displayName =
        row?.name ||
        body?.student?.full_name ||
        reportViewModel?.sections?.students?.items?.find((i) => i.studentId === studentId)?.name ||
        "ילד/ה";
      setNestedStudentVm(
        parseStudentReportViewModel(
          body,
          {
            studentId,
            displayName,
            physicalClassName: ctxClass?.name,
            gradeLevel: ctxClass?.gradeLevel,
          },
          {
            schoolName: me?.school?.name,
            subjectFocus: ctxClass?.subjectFocus,
          }
        )
      );
    };

    setStudentReportLoading(true);
    try {
      const result = await fetchSchoolReportCached({
        accessToken,
        schoolId,
        path,
        force,
      });
      if (result?.status === 200) applyBody(result.body);
    } finally {
      setStudentReportLoading(false);
    }
  };

  const openClassReport = async (cls, { force = false, range = null } = {}) => {
    if (!accessToken) return;
    reportClassRef.current = cls;
    setReportClass(cls);
    setReportOpen(true);
    setReportError("");
    setReportViewModel(null);
    setReportLoading(true);

    activeRangeRefetchRef.current = (r) => {
      void openClassReport(cls, { force: true, range: r });
    };

    const params = buildRangeParams(range);
    const path = `/api/school/classes/${cls.classId}/report-data?${params.toString()}`;

    const applyBody = (body) => {
      setReportViewModel(
        parseClassReportViewModel(body, { ...cls, classId: cls.classId }, body.schoolManagerExtras || {})
      );
    };

    try {
      const result = await fetchSchoolReportCached({
        accessToken,
        schoolId,
        path,
        force,
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

  const breadcrumbSteps = [
    {
      label: SCHOOL_CHOOSE_GRADE,
      onClick: gradeLevel ? () => { setGradeLevel(""); setPhysicalKey(""); } : undefined,
      active: !gradeLevel,
    },
    gradeLevel
      ? {
          label: schoolGradeLabelHe(gradeLevel),
          onClick: physicalKey ? () => setPhysicalKey("") : undefined,
          active: gradeLevel && !physicalKey,
        }
      : null,
    physicalKey && selectedPhysical ? { label: selectedPhysical.name, active: true } : null,
  ].filter(Boolean);

  return (
    <Layout>
      <SchoolPortalShell
        title={SCHOOL_CLASSES_TITLE}
        subtitle={SCHOOL_CLASSES_SUBTITLE}
        schoolName={me?.school?.name}
        showTeacherDashboardLink={me?.hasTeacherActivity}
      >
        {state === "loading" ? (
          <SchoolLoadingBlock message={SCHOOL_LOADING} />
        ) : error ? (
          <SchoolErrorBlock message={error} onRetry={() => void reload()} />
        ) : (
          <>
            <SchoolDrillBreadcrumb steps={breadcrumbSteps} />

            {!gradeLevel ? (
              <SchoolSection title={SCHOOL_CHOOSE_GRADE}>
                {loading ? <p className="text-xs text-white/45 mb-3 text-right">{SCHOOL_LOADING_DATA}</p> : null}
                <SchoolCardGrid columns={3}>
                  {SCHOOL_GRADE_OPTIONS.map((grade) => {
                    const count = classes ? gradePhysicalCounts.get(grade.level) ?? null : null;
                    return (
                      <SchoolManagementCard
                        key={grade.level}
                        title={grade.label}
                        subtitle={
                          count != null ? `${count} כיתות פיזיות` : loading ? "…" : "-"
                        }
                        gradeStatusLabel={browseStatus?.gradeStatusByLevel?.[grade.level] || null}
                        onClick={() => setGradeLevel(grade.level)}
                      />
                    );
                  })}
                </SchoolCardGrid>
                {!loading && !classes?.length ? <SchoolEmptyState title={SCHOOL_EMPTY_CLASSES} /> : null}
              </SchoolSection>
            ) : null}

            {gradeLevel && !physicalKey ? (
              <>
                <SchoolBackButton
                  label={SCHOOL_BACK_GRADES}
                  onClick={() => {
                    setGradeLevel("");
                    setPhysicalKey("");
                  }}
                />
                <SchoolSection title={`${SCHOOL_CHOOSE_PHYSICAL_CLASS} · ${schoolGradeLabelHe(gradeLevel)}`}>
                  {loading ? (
                    <SchoolLoadingBlock message={SCHOOL_LOADING_DATA} />
                  ) : physicalGroups.length ? (
                    <SchoolCardGrid columns={2}>
                      {physicalGroups.map((group) => {
                        const physKey = physicalClassGroupKey(group.subjectClasses[0]);
                        return (
                          <SchoolManagementCard
                            key={physKey}
                            title={group.name}
                            subtitle={`${physicalClassStudentCount(group.subjectClasses)} ${SCHOOL_STUDENTS_IN_CLASS} · 6 מקצועות`}
                            classStatusLabel={browseStatus?.physicalByKey?.[physKey] || null}
                            onClick={() => setPhysicalKey(physKey)}
                          />
                        );
                      })}
                    </SchoolCardGrid>
                  ) : (
                    <SchoolEmptyState title="אין כיתות בשכבה זו." />
                  )}
                </SchoolSection>
              </>
            ) : null}

            {gradeLevel && physicalKey && selectedPhysical ? (
              <>
                <SchoolBackButton label={SCHOOL_BACK_CLASSES} onClick={() => setPhysicalKey("")} />
                <SchoolSection title={`${SCHOOL_CHOOSE_SUBJECT} · ${selectedPhysical.name}`}>
                  {(() => {
                    const classStatus =
                      browseStatus?.physicalByKey?.[
                        physicalClassGroupKey(selectedPhysical.subjectClasses[0])
                      ];
                    if (!classStatus) return null;
                    return (
                      <p className="text-sm mb-3 text-right" data-testid="school-physical-class-browse-status">
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
                    <button
                      type="button"
                      onClick={() => void openPhysicalClassReport(selectedPhysical)}
                      className="w-full rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 px-4 py-3 text-right font-semibold text-amber-100 transition"
                      data-testid="school-physical-class-report-button"
                    >
                      {SCHOOL_PHYSICAL_CLASS_REPORT_BUTTON}
                    </button>
                  </div>
                  <SchoolCardGrid columns={2}>
                    {subjectClasses.map((cls) => (
                      <SchoolSubjectClassCard
                        key={cls.classId}
                        cls={cls}
                        reportLabel={SCHOOL_VIEW_CLASS_REPORT}
                        onReport={() => void openClassReport(cls)}
                      />
                    ))}
                  </SchoolCardGrid>
                </SchoolSection>
              </>
            ) : null}

            <SchoolReportModal
              open={reportOpen}
              title={SCHOOL_CLASS_REPORT_TITLE}
              onClose={closeReport}
              loading={reportLoading}
              loadingLabel={SCHOOL_REPORT_LOADING}
              error={reportError}
              viewModel={reportViewModel}
              onStudentReport={openStudentReportFromClass}
              studentReportLoading={studentReportLoading}
              nestedStudentViewModel={nestedStudentVm}
              onCloseStudentReport={() => {
                setNestedStudentVm(null);
                if (reportClassRef.current) {
                  activeRangeRefetchRef.current = (r) => {
                    void openClassReport(reportClassRef.current, { force: true, range: r });
                  };
                }
              }}
              accessToken={accessToken}
              canManageAssignment={canManageAssignment}
              rangeControl={reportRangeControl}
            />

            <SchoolReportModal
              open={physicalReportOpen}
              title={SCHOOL_PHYSICAL_CLASS_REPORT_TITLE}
              onClose={closePhysicalReport}
              loading={physicalReportLoading}
              loadingLabel={SCHOOL_PHYSICAL_CLASS_LOADING}
              error={physicalReportError}
              viewModel={physicalReportVm}
              onStudentReport={openStudentReportFromPhysical}
              studentReportLoading={physicalStudentReportLoading}
              nestedStudentViewModel={physicalNestedStudentVm}
              onCloseStudentReport={() => {
                setPhysicalNestedStudentVm(null);
                if (physicalReportContext) {
                  activeRangeRefetchRef.current = (r) => {
                    void openPhysicalClassReport(
                      { name: physicalReportContext.name },
                      { force: true, range: r }
                    );
                  };
                }
              }}
              onRowAction={handlePhysicalRowAction}
              accessToken={accessToken}
              canManageAssignment={canManageAssignment}
              rangeControl={reportRangeControl}
            />

            <SchoolReportModal
              open={subjectFromPhysicalOpen}
              title={SCHOOL_CLASS_REPORT_TITLE}
              onClose={closeSubjectFromPhysical}
              loading={subjectFromPhysicalLoading}
              loadingLabel={SCHOOL_REPORT_LOADING}
              error={subjectFromPhysicalError}
              viewModel={subjectFromPhysicalVm}
              onStudentReport={openStudentReportFromSubjectPhysical}
              studentReportLoading={subjectFromPhysicalStudentLoading}
              nestedStudentViewModel={subjectFromPhysicalNestedStudentVm}
              onCloseStudentReport={() => {
                setSubjectFromPhysicalNestedStudentVm(null);
                const cls = subjectFromPhysicalClassRef.current || subjectFromPhysicalClass;
                if (cls) {
                  activeRangeRefetchRef.current = (r) => {
                    void openSubjectReportFromPhysical(cls, { force: true, range: r });
                  };
                }
              }}
              stackZIndexBase={REPORT_STACK_SUBJECT_OVER_PHYSICAL}
              accessToken={accessToken}
              canManageAssignment={canManageAssignment}
              rangeControl={reportRangeControl}
            />

            <SchoolTeacherDetailModal
              open={teacherDetailOpen}
              onClose={closeTeacherDetail}
              subtitle={
                physicalReportContext?.name
                  ? `${SCHOOL_PHYSICAL_CLASS_REPORT_TITLE} · ${physicalReportContext.name}`
                  : SCHOOL_PHYSICAL_CLASS_REPORT_TITLE
              }
              teacherId={teacherDetailId}
              accessToken={accessToken}
              schoolId={schoolId}
              schoolName={me?.school?.name}
              zIndex={REPORT_STACK_TEACHER_DETAIL}
              modalStackBase={REPORT_STACK_TEACHER_DETAIL_NESTED}
            />
          </>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
