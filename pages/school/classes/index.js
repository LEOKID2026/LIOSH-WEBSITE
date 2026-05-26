import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import SchoolPortalShell from "../../../components/school-portal/SchoolPortalShell";
import {
  SchoolDataTable,
  SchoolEmptyState,
  SchoolReportPreview,
  SchoolSecondaryButton,
  SchoolSection,
  SchoolTableCell,
  SchoolTableRow,
} from "../../../components/school-portal/SchoolPortalUi";
import { useSchoolPortalLoad } from "../../../lib/school-portal/use-school-portal-session";
import {
  schoolAuthFetch,
  schoolSubjectLabelHe,
  SCHOOL_CLASSES_SUBTITLE,
  SCHOOL_CLASSES_TITLE,
  SCHOOL_COL_ACTIONS,
  SCHOOL_COL_CLASS,
  SCHOOL_COL_GRADE,
  SCHOOL_COL_MEMBERS,
  SCHOOL_COL_SUBJECT_FOCUS,
  SCHOOL_COL_TEACHER,
  SCHOOL_EMPTY_CLASSES,
  SCHOOL_LOADING,
  SCHOOL_REPORT_CLOSE,
  SCHOOL_REPORT_LOADING,
  SCHOOL_REPORT_SUMMARY,
  SCHOOL_VIEW_CLASS_REPORT,
} from "../../../lib/school-portal/school-ui.he";

export default function SchoolClassesPage() {
  const router = useRouter();
  const { state, accessToken, me } = useSchoolPortalLoad();
  const [classes, setClasses] = useState([]);
  const [reportClassId, setReportClassId] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportSummary, setReportSummary] = useState(null);

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
  }, [state, router]);

  useEffect(() => {
    if (state !== "ready" || !accessToken) return;
    schoolAuthFetch(accessToken, "/api/school/classes").then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (res.status === 200) setClasses(body.data?.classes || []);
    });
  }, [state, accessToken]);

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
      const summary = body?.summary;
      const accuracy = summary?.accuracy != null ? `${summary.accuracy}%` : "—";
      setReportSummary({
        title: `${SCHOOL_REPORT_SUMMARY}: ${cls.name}`,
        line: `תשובות: ${summary?.totalAnswers ?? 0} · דיוק: ${accuracy} · מורים בכיתה: ${cls.teacherName || "—"}`,
      });
    } finally {
      setReportLoading(false);
    }
  };

  const columns = [
    { key: "class", label: SCHOOL_COL_CLASS },
    { key: "grade", label: SCHOOL_COL_GRADE, className: "text-center" },
    { key: "subject", label: SCHOOL_COL_SUBJECT_FOCUS },
    { key: "teacher", label: SCHOOL_COL_TEACHER },
    { key: "members", label: SCHOOL_COL_MEMBERS, className: "text-center" },
    { key: "actions", label: SCHOOL_COL_ACTIONS, className: "text-center" },
  ];

  return (
    <Layout>
      <SchoolPortalShell
        title={SCHOOL_CLASSES_TITLE}
        subtitle={SCHOOL_CLASSES_SUBTITLE}
        schoolName={me?.school?.name}
        showTeacherDashboardLink={me?.hasTeacherActivity}
      >
        {state === "loading" ? (
          <p className="text-white/60 text-sm text-right">{SCHOOL_LOADING}</p>
        ) : (
          <>
            <SchoolSection>
              {classes.length ? (
                <SchoolDataTable columns={columns} emptyMessage={SCHOOL_EMPTY_CLASSES}>
                  {classes.map((c) => (
                    <SchoolTableRow key={c.classId}>
                      <SchoolTableCell>
                        <p className="font-medium">{c.name}</p>
                        {c.isArchived ? (
                          <p className="text-xs text-white/45 mt-0.5">בארכיון</p>
                        ) : null}
                      </SchoolTableCell>
                      <SchoolTableCell className="text-center text-white/75">
                        {c.gradeLevel || "—"}
                      </SchoolTableCell>
                      <SchoolTableCell>{schoolSubjectLabelHe(c.subjectFocus)}</SchoolTableCell>
                      <SchoolTableCell>
                        <p className="text-white/85">{c.teacherName || "—"}</p>
                      </SchoolTableCell>
                      <SchoolTableCell className="text-center tabular-nums">
                        {c.memberCount ?? 0}
                      </SchoolTableCell>
                      <SchoolTableCell className="text-center">
                        <SchoolSecondaryButton onClick={() => void openClassReport(c)}>
                          {SCHOOL_VIEW_CLASS_REPORT}
                        </SchoolSecondaryButton>
                      </SchoolTableCell>
                    </SchoolTableRow>
                  ))}
                </SchoolDataTable>
              ) : (
                <SchoolEmptyState title={SCHOOL_EMPTY_CLASSES} />
              )}
            </SchoolSection>

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
