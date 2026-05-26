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
import {
  SchoolEmptyState,
  SchoolReportPreview,
  SchoolSection,
} from "../../../components/school-portal/SchoolPortalUi";
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
  schoolClassReportSummaryFromBody,
  SCHOOL_BACK_CLASSES,
  SCHOOL_BACK_GRADES,
  SCHOOL_CHOOSE_GRADE,
  SCHOOL_CHOOSE_PHYSICAL_CLASS,
  SCHOOL_CHOOSE_SUBJECT,
  SCHOOL_CLASSES_SUBTITLE,
  SCHOOL_CLASSES_TITLE,
  SCHOOL_EMPTY_CLASSES,
  SCHOOL_LOADING,
  SCHOOL_REPORT_CLOSE,
  SCHOOL_REPORT_LOADING,
  SCHOOL_STUDENTS_IN_CLASS,
  SCHOOL_VIEW_CLASS_REPORT,
} from "../../../lib/school-portal/school-ui.he";

export default function SchoolClassesPage() {
  const router = useRouter();
  const { state, accessToken, me } = useSchoolPortalLoad();
  const [gradeLevel, setGradeLevel] = useState("");
  const [physicalKey, setPhysicalKey] = useState("");
  const [reportClassId, setReportClassId] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportSummary, setReportSummary] = useState(null);

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

  const physicalGroups = useMemo(
    () => (gradeLevel ? groupPhysicalClassesForGrade(classes || [], gradeLevel) : []),
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

  const openClassReport = async (cls) => {
    if (!accessToken) return;
    setReportClassId(cls.classId);
    setReportLoading(true);
    setReportError("");
    setReportSummary(null);
    try {
      const res = await schoolAuthFetch(
        accessToken,
        `/api/school/classes/${cls.classId}/report-data?windowDays=30`
      );
      const body = await res.json().catch(() => ({}));
      if (res.status !== 200) {
        setReportError(body?.error?.message || body?.error?.code || "שגיאה בטעינת דוח");
        return;
      }
      const label = `${cls.name || "כיתה"} · ${schoolGradeLabelHe(cls.gradeLevel)}`;
      setReportSummary(schoolClassReportSummaryFromBody(body, label));
    } finally {
      setReportLoading(false);
    }
  };

  const breadcrumbSteps = [
    { label: SCHOOL_CHOOSE_GRADE, onClick: gradeLevel ? () => { setGradeLevel(""); setPhysicalKey(""); } : undefined, active: !gradeLevel },
    gradeLevel
      ? {
          label: schoolGradeLabelHe(gradeLevel),
          onClick: physicalKey ? () => setPhysicalKey("") : undefined,
          active: gradeLevel && !physicalKey,
        }
      : null,
    physicalKey && selectedPhysical
      ? { label: selectedPhysical.name, active: true }
      : null,
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
        ) : loading ? (
          <SchoolLoadingBlock />
        ) : error ? (
          <SchoolErrorBlock message={error} onRetry={() => void reload()} />
        ) : (
          <>
            <SchoolDrillBreadcrumb steps={breadcrumbSteps} />

            {!gradeLevel ? (
              <SchoolSection title={SCHOOL_CHOOSE_GRADE}>
                <SchoolCardGrid columns={3}>
                  {SCHOOL_GRADE_OPTIONS.map((grade) => {
                    const count = groupPhysicalClassesForGrade(classes || [], grade.level).length;
                    return (
                      <SchoolManagementCard
                        key={grade.level}
                        title={grade.label}
                        subtitle={`${count} כיתות פיזיות`}
                        onClick={() => setGradeLevel(grade.level)}
                      />
                    );
                  })}
                </SchoolCardGrid>
                {!classes?.length ? <SchoolEmptyState title={SCHOOL_EMPTY_CLASSES} /> : null}
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
                  {physicalGroups.length ? (
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

            {reportClassId ? (
              <SchoolReportPreview
                loading={reportLoading ? SCHOOL_REPORT_LOADING : null}
                error={reportError}
                summary={reportSummary}
                onClose={() => {
                  setReportClassId(null);
                  setReportSummary(null);
                  setReportError("");
                }}
                closeLabel={SCHOOL_REPORT_CLOSE}
              />
            ) : null}
          </>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
