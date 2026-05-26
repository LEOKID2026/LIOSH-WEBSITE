import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import SchoolPortalShell from "../../../components/school-portal/SchoolPortalShell";
import {
  SchoolDataTable,
  SchoolEmptyState,
  SchoolPrimaryButton,
  SchoolReportPreview,
  SchoolSecondaryButton,
  SchoolSection,
  SchoolTableCell,
  SchoolTableRow,
  SCHOOL_CARD,
  SCHOOL_CARD_INNER,
} from "../../../components/school-portal/SchoolPortalUi";
import { useSchoolPortalLoad } from "../../../lib/school-portal/use-school-portal-session";
import {
  schoolAuthFetch,
  SCHOOL_COL_ACTIONS,
  SCHOOL_COL_GRADE,
  SCHOOL_COL_LINKED,
  SCHOOL_COL_STUDENT,
  SCHOOL_EMPTY_STUDENTS,
  SCHOOL_EMPTY_STUDENTS_HINT,
  SCHOOL_ENROLL_STUDENT,
  SCHOOL_LOADING,
  SCHOOL_NO_LINKED_TEACHERS,
  SCHOOL_REPORT_CLOSE,
  SCHOOL_REPORT_LOADING,
  SCHOOL_REPORT_SUMMARY,
  SCHOOL_SEARCH_STUDENTS,
  SCHOOL_STUDENT_ID,
  SCHOOL_STUDENTS_SUBTITLE,
  SCHOOL_STUDENTS_TITLE,
  SCHOOL_VIEW_STUDENT_REPORT,
} from "../../../lib/school-portal/school-ui.he";

export default function SchoolStudentsPage() {
  const router = useRouter();
  const { state, accessToken, me } = useSchoolPortalLoad();
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [reportStudentId, setReportStudentId] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportSummary, setReportSummary] = useState(null);

  useEffect(() => {
    if (state === "unauthenticated") router.replace("/teacher/login");
    if (state === "forbidden") router.replace("/teacher/dashboard");
  }, [state, router]);

  const load = async () => {
    if (!accessToken) return;
    const res = await schoolAuthFetch(accessToken, "/api/school/students");
    const body = await res.json().catch(() => ({}));
    if (res.status === 200) setStudents(body.data?.students || []);
  };

  useEffect(() => {
    if (state === "ready") void load();
  }, [state, accessToken]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const name = String(s.displayName || "").toLowerCase();
      const id = String(s.studentId || "").toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [students, search]);

  const enroll = async (e) => {
    e.preventDefault();
    if (!accessToken) return;
    setBusy(true);
    try {
      await schoolAuthFetch(accessToken, "/api/school/students", {
        method: "POST",
        body: JSON.stringify({ studentId: studentId.trim() }),
      });
      setStudentId("");
      await load();
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
      const summary = body?.summary;
      const accuracy = summary?.accuracy != null ? `${summary.accuracy}%` : "—";
      const name = student.displayName || student.studentId;
      setReportSummary({
        title: `${SCHOOL_REPORT_SUMMARY}: ${name}`,
        line: `תשובות: ${summary?.totalAnswers ?? 0} · דיוק: ${accuracy} · שכבה: ${student.gradeLevel || "—"}`,
      });
    } finally {
      setReportLoading(false);
    }
  };

  const closeReport = () => {
    setReportStudentId(null);
    setReportSummary(null);
    setReportError("");
  };

  const columns = [
    { key: "student", label: SCHOOL_COL_STUDENT },
    { key: "grade", label: SCHOOL_COL_GRADE, className: "text-center" },
    { key: "linked", label: SCHOOL_COL_LINKED },
    { key: "actions", label: SCHOOL_COL_ACTIONS, className: "text-center" },
  ];

  return (
    <Layout>
      <SchoolPortalShell
        title={SCHOOL_STUDENTS_TITLE}
        subtitle={SCHOOL_STUDENTS_SUBTITLE}
        schoolName={me?.school?.name}
        showTeacherDashboardLink={me?.hasTeacherActivity}
      >
        {state === "loading" ? (
          <p className="text-white/60 text-sm text-right">{SCHOOL_LOADING}</p>
        ) : (
          <div className="space-y-6">
            <div className={`${SCHOOL_CARD} ${SCHOOL_CARD_INNER} text-right`}>
              <h2 className="font-semibold text-base mb-3">{SCHOOL_ENROLL_STUDENT}</h2>
              <form onSubmit={enroll} className="space-y-3 max-w-xl">
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
            </div>

            <SchoolSection>
              <div className="mb-4">
                <label className="block text-sm text-white/70 text-right">
                  {SCHOOL_SEARCH_STUDENTS}
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="mt-1 w-full max-w-md mr-0 ml-auto block rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-sm"
                    placeholder="שם או מזהה"
                  />
                </label>
              </div>

              {filtered.length ? (
                <SchoolDataTable columns={columns} emptyMessage={SCHOOL_EMPTY_STUDENTS}>
                  {filtered.map((s) => (
                    <SchoolTableRow key={s.studentId}>
                      <SchoolTableCell>
                        <p className="font-medium">{s.displayName || "ללא שם"}</p>
                        <p className="text-xs text-white/45 font-mono mt-0.5 break-all">{s.studentId}</p>
                      </SchoolTableCell>
                      <SchoolTableCell className="text-center text-white/75">
                        {s.gradeLevel || "—"}
                      </SchoolTableCell>
                      <SchoolTableCell>
                        {s.linkedTeachers?.length ? (
                          <ul className="text-xs text-white/65 space-y-0.5">
                            {s.linkedTeachers.map((t) => (
                              <li key={t.teacherId}>{t.displayName || t.teacherId}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-xs text-white/45">{SCHOOL_NO_LINKED_TEACHERS}</span>
                        )}
                      </SchoolTableCell>
                      <SchoolTableCell className="text-center">
                        <SchoolSecondaryButton onClick={() => void openStudentReport(s)}>
                          {SCHOOL_VIEW_STUDENT_REPORT}
                        </SchoolSecondaryButton>
                      </SchoolTableCell>
                    </SchoolTableRow>
                  ))}
                </SchoolDataTable>
              ) : students.length ? (
                <SchoolEmptyState title="לא נמצאו תלמידים בחיפוש." />
              ) : (
                <SchoolEmptyState title={SCHOOL_EMPTY_STUDENTS} hint={SCHOOL_EMPTY_STUDENTS_HINT} />
              )}
            </SchoolSection>

            {reportStudentId ? (
              <SchoolReportPreview
                loading={reportLoading ? SCHOOL_REPORT_LOADING : null}
                error={reportError}
                summary={reportSummary}
                onClose={closeReport}
                closeLabel={SCHOOL_REPORT_CLOSE}
              />
            ) : null}
          </div>
        )}
      </SchoolPortalShell>
    </Layout>
  );
}
