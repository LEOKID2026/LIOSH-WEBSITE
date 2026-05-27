import { useEffect, useMemo, useRef, useState } from "react";
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

  const openStudentReportFromPhysical = async (studentId, row) => {
    if (!accessToken || !studentId || !physicalReportContext) return;
    const params = new URLSearchParams({
      windowDays: "30",
      gradeLevel: String(physicalReportContext.gradeLevel),
      physicalClassName: String(physicalReportContext.name),
    });
    const path = `/api/school/students/${studentId}/report-data?${params.toString()}`;

    const applyBody = (body) => {
      const displayName =
        row?.name ||
        body?.student?.full_name ||
        physicalReportVm?.sections?.students?.items?.find((i) => i.studentId === studentId)?.name ||
        "תלמיד/ה";
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
      const result = await fetchSchoolReportCached({ accessToken, schoolId, path });
      if (result?.status === 200) applyBody(result.body);
    } finally {
      setPhysicalStudentReportLoading(false);
    }
  };

  const openStudentReportFromSubjectPhysical = async (studentId, row) => {
    if (!accessToken || !studentId) return;
    const ctxClass = subjectFromPhysicalClassRef.current || subjectFromPhysicalClass;
    const params = new URLSearchParams({ windowDays: "30" });
    if (ctxClass?.classId) params.set("classId", String(ctxClass.classId));
    const path = `/api/school/students/${studentId}/report-data?${params.toString()}`;

    const applyBody = (body) => {
      const displayName =
        row?.name ||
        body?.student?.full_name ||
        subjectFromPhysicalVm?.sections?.students?.items?.find((i) => i.studentId === studentId)?.name ||
        "תלמיד/ה";
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
      const result = await fetchSchoolReportCached({ accessToken, schoolId, path });
      if (result?.status === 200) applyBody(result.body);
    } finally {
      setSubjectFromPhysicalStudentLoading(false);
    }
  };

  const openPhysicalClassReport = async (physicalGroup) => {
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

    const params = new URLSearchParams({
      windowDays: "30",
      gradeLevel: String(gradeLevel),
      physicalClassName: physicalGroup.name,
    });
    const path = `/api/school/classes/physical-report?${params.toString()}`;

    try {
      const result = await fetchSchoolReportCached({ accessToken, schoolId, path });
      if (result?.status !== 200) {
        setPhysicalReportError(apiErrorMessageHe(result?.body?.error, "שגיאה בטעינת דוח"));
        return;
      }
      setPhysicalReportVm(
        parsePhysicalClassReportViewModel(result.body, {
          schoolName: me?.school?.name,
          gradeLevel,
          physicalClassName: physicalGroup.name,
        })
      );
    } finally {
      setPhysicalReportLoading(false);
    }
  };

  const openSubjectReportFromPhysical = async (cls) => {
    if (!accessToken || !cls?.classId) return;
    subjectFromPhysicalClassRef.current = cls;
    setSubjectFromPhysicalClass(cls);
    setSubjectFromPhysicalOpen(true);
    setSubjectFromPhysicalError("");
    setSubjectFromPhysicalVm(null);
    setSubjectFromPhysicalNestedStudentVm(null);
    setSubjectFromPhysicalLoading(true);

    const path = `/api/school/classes/${cls.classId}/report-data?windowDays=30`;

    try {
      const result = await fetchSchoolReportCached({ accessToken, schoolId, path });
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

  const openStudentReportFromClass = async (studentId, row) => {
    if (!accessToken || !studentId) return;
    const ctxClass = reportClassRef.current || reportClass;
    const params = new URLSearchParams({ windowDays: "30" });
    if (ctxClass?.classId) params.set("classId", String(ctxClass.classId));
    const path = `/api/school/students/${studentId}/report-data?${params.toString()}`;

    const applyBody = (body) => {
      const displayName =
        row?.name ||
        body?.student?.full_name ||
        reportViewModel?.sections?.students?.items?.find((i) => i.studentId === studentId)?.name ||
        "תלמיד/ה";
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
      });
      if (result?.status === 200) applyBody(result.body);
    } finally {
      setStudentReportLoading(false);
    }
  };

  const openClassReport = async (cls) => {
    if (!accessToken) return;
    reportClassRef.current = cls;
    setReportClass(cls);
    setReportOpen(true);
    setReportError("");
    setReportViewModel(null);
    setReportLoading(true);
    const path = `/api/school/classes/${cls.classId}/report-data?windowDays=30`;

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
                          count != null ? `${count} כיתות פיזיות` : loading ? "…" : "—"
                        }
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
                      {physicalGroups.map((group) => (
                        <SchoolManagementCard
                          key={physicalClassGroupKey(group.subjectClasses[0])}
                          title={group.name}
                          subtitle={`${physicalClassStudentCount(group.subjectClasses)} ${SCHOOL_STUDENTS_IN_CLASS} · 6 מקצועות`}
                          onClick={() => setPhysicalKey(physicalClassGroupKey(group.subjectClasses[0]))}
                        />
                      ))}
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
              onCloseStudentReport={() => setNestedStudentVm(null)}
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
              onCloseStudentReport={() => setPhysicalNestedStudentVm(null)}
              onRowAction={handlePhysicalRowAction}
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
              onCloseStudentReport={() => setSubjectFromPhysicalNestedStudentVm(null)}
              stackZIndexBase={REPORT_STACK_SUBJECT_OVER_PHYSICAL}
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
