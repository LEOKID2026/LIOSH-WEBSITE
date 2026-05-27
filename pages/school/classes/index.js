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
  SchoolSubjectClassCard,
} from "../../../components/school-portal/SchoolDrillDown";
import SchoolReportModal from "../../../components/school-portal/SchoolReportModal";
import { parseClassReportViewModel, parseStudentReportViewModel } from "../../../lib/school-portal/school-report-view-model";
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
import {
  schoolAuthFetch,
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
  SCHOOL_VIEW_CLASS_REPORT,
} from "../../../lib/school-portal/school-ui.he";

export default function SchoolClassesPage() {
  const router = useRouter();
  const { state, accessToken, me } = useSchoolPortalLoad();
  const [gradeLevel, setGradeLevel] = useState("");
  const [physicalKey, setPhysicalKey] = useState("");

  const [reportOpen, setReportOpen] = useState(false);
  const [reportClass, setReportClass] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportViewModel, setReportViewModel] = useState(null);
  const [nestedStudentVm, setNestedStudentVm] = useState(null);
  const [studentReportLoading, setStudentReportLoading] = useState(false);

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
    "/api/school/classes",
    parseClasses,
    state === "ready"
  );

  useEffect(() => {
    setReportOpen(false);
    setReportClass(null);
    setReportError("");
    setReportViewModel(null);
    setNestedStudentVm(null);
  }, [gradeLevel, physicalKey]);

  const physicalGroups = useMemo(
    () => (gradeLevel && classes ? groupPhysicalClassesForGrade(classes, gradeLevel) : []),
    [classes, gradeLevel]
  );

  const selectedPhysical = useMemo(
    () => physicalGroups.find((g) => physicalClassGroupKey(g.subjectClasses[0]) === physicalKey) || null,
    [physicalGroups, physicalKey]
  );

  const subjectClasses = useMemo(
    () => (selectedPhysical ? sortSubjectClasses(selectedPhysical.subjectClasses) : []),
    [selectedPhysical]
  );

  const closeReport = () => {
    setReportOpen(false);
    setReportClass(null);
    setReportError("");
    setReportViewModel(null);
    setNestedStudentVm(null);
  };

  const openStudentReportFromClass = async (studentId) => {
    if (!accessToken || !studentId) return;
    setStudentReportLoading(true);
    try {
      const res = await schoolAuthFetch(
        accessToken,
        `/api/school/students/${studentId}/report-data?windowDays=30`
      );
      const body = await res.json().catch(() => ({}));
      if (res.status !== 200) return;
      setNestedStudentVm(
        parseStudentReportViewModel(
          body,
          {
            studentId,
            displayName: body?.student?.fullName || "תלמיד/ה",
            physicalClassName: reportClass?.name,
            gradeLevel: reportClass?.gradeLevel,
          },
          { schoolName: me?.school?.name }
        )
      );
    } finally {
      setStudentReportLoading(false);
    }
  };

  const openClassReport = async (cls) => {
    if (!accessToken) return;
    setReportClass(cls);
    setReportOpen(true);
    setReportLoading(true);
    setReportError("");
    setReportViewModel(null);
    try {
      const res = await schoolAuthFetch(
        accessToken,
        `/api/school/classes/${cls.classId}/report-data?windowDays=30`
      );
      const body = await res.json().catch(() => ({}));
      if (res.status !== 200) {
        setReportError(apiErrorMessageHe(body?.error, "שגיאה בטעינת דוח"));
        return;
      }
      setReportViewModel(
        parseClassReportViewModel(body, { ...cls, classId: cls.classId }, body.schoolManagerExtras || {})
      );
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
                    const count = classes
                      ? groupPhysicalClassesForGrade(classes, grade.level).length
                      : null;
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
          </>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
