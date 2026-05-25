import { useMemo } from "react";
import Layout from "../../../components/Layout";
import GuardianAccessPanel from "../../../components/teacher-portal/GuardianAccessPanel";
import SubjectSummaryCards from "../../../components/teacher-portal/SubjectSummaryCards";
import TeacherPortalShell from "../../../components/teacher-portal/TeacherPortalShell";
import {
  TeacherReportError,
  TeacherReportForbidden,
  TeacherReportLoading,
} from "../../../components/teacher-portal/TeacherReportPageStates";
import {
  isTeacherStudentReportResponse,
  useTeacherPortalLoad,
} from "../../../lib/teacher-portal/use-teacher-portal-session";
import {
  formatDateHe,
  formatPercent,
  formatTopicLineHe,
  riskLevelHe,
  riskSignalHe,
  subjectLabelHe,
  supportSuggestionHe,
} from "../../../lib/teacher-portal/teacher-ui.he.js";

export async function getServerSideProps(context) {
  const studentId = String(context.params?.studentId || "").trim();
  return { props: { studentId } };
}

export default function TeacherStudentReportPage({ studentId }) {
  const fetchPath = useMemo(() => {
    if (!studentId) return "";
    return `/api/teacher/students/${encodeURIComponent(studentId)}/report-data`;
  }, [studentId]);

  const { phase, loadingHint, errorMessage, accessToken, data: report, reload } =
    useTeacherPortalLoad({
      enabled: Boolean(studentId),
      fetchPath,
      fetchTimeoutMs: 60_000,
      isValidResponse: isTeacherStudentReportResponse,
    });

  if (!studentId) {
    return (
      <Layout>
        <TeacherReportForbidden
          backHref="/teacher/dashboard"
          title="דוח תלמיד"
          message="מזהה תלמיד שגוי."
        />
      </Layout>
    );
  }

  if (phase === "loading") {
    return (
      <Layout>
        <TeacherReportLoading
          backHref="/teacher/dashboard"
          title="דוח תלמיד"
          hint={loadingHint}
        />
      </Layout>
    );
  }

  if (phase === "forbidden") {
    return (
      <Layout>
        <TeacherReportForbidden
          backHref="/teacher/dashboard"
          title="דוח תלמיד"
          message="אין לך הרשאה לצפות בדוח תלמיד זה."
        />
      </Layout>
    );
  }

  if (phase === "error" || !report) {
    return (
      <Layout>
        <TeacherReportError
          backHref="/teacher/dashboard"
          title="דוח תלמיד"
          message={errorMessage}
          onRetry={reload}
        />
      </Layout>
    );
  }

  const studentName =
    report?.student?.full_name || report?.accountSnapshot?.displayName || "תלמיד";
  const guidance = report?.teacherGuidanceBlock || {};
  const tg = guidance.teacherGuidance || {};
  const summary = report?.summary || {};
  const gas = report?.guardianAccessSummary || {};

  const inactiveDays = tg.inactiveDays;
  const riskSignals = (guidance.riskSignals || []).map(riskSignalHe).filter(Boolean);
  const strengths = (guidance.strengthsForTeacher || [])
    .map((s) => {
      const line = formatTopicLineHe(s.subject, s.topic);
      return line ? `${line} — ${formatPercent(s.accuracy)} הצלחה` : null;
    })
    .filter(Boolean);
  const suggestions = (guidance.supportSuggestions || [])
    .map(supportSuggestionHe)
    .filter(Boolean);
  const focusItems = (guidance.nextPracticeFocus || [])
    .map((f) => {
      const line = formatTopicLineHe(f.subject, f.topic);
      return line || subjectLabelHe(f.subject);
    })
    .filter(Boolean);

  return (
    <Layout>
      <div
        data-testid="teacher-student-report-root"
        data-state="ready"
        data-student-id={studentId}
        data-report-ok="true"
      >
        <TeacherPortalShell backHref="/teacher/dashboard" title={`דוח תלמיד: ${studentName}`}>
          <p className="text-white/60 text-sm mb-6">נתונים מ-30 הימים האחרונים</p>

          <section className="rounded-xl border border-white/15 bg-black/30 p-5 mb-6">
            <h2 className="text-lg font-semibold mb-3">סיכום</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <dt className="text-white/60">מפגשי תרגול</dt>
                <dd className="font-semibold">{summary.totalSessions ?? 0}</dd>
              </div>
              <div>
                <dt className="text-white/60">תשובות</dt>
                <dd className="font-semibold">{summary.totalAnswers ?? 0}</dd>
              </div>
              <div>
                <dt className="text-white/60">אחוז הצלחה</dt>
                <dd className="font-semibold">{formatPercent(summary.accuracy)}</dd>
              </div>
              <div>
                <dt className="text-white/60">פעילות אחרונה</dt>
                <dd className="font-semibold">
                  {tg.lastActivityDate ? formatDateHe(tg.lastActivityDate) : "—"}
                </dd>
              </div>
            </dl>
            {inactiveDays != null && inactiveDays >= 7 ? (
              <p className="mt-3 text-amber-200 text-sm">
                התלמיד לא תרגל ביותר מ-7 ימים.
              </p>
            ) : null}
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">ביצועים לפי מקצוע</h2>
            <SubjectSummaryCards subjects={report.subjects} />
          </section>

          <section className="rounded-xl border border-white/15 bg-black/30 p-5 mb-6">
            <h2 className="text-lg font-semibold mb-3">המלצות לי כמורה</h2>
            {guidance.insufficientData ? (
              <p className="text-white/70 text-sm">אין מספיק נתונים לניתוח</p>
            ) : (
              <>
                {riskLevelHe(tg.riskLevel) ? (
                  <p className="text-amber-200 mb-2">{riskLevelHe(tg.riskLevel)}</p>
                ) : null}
                {inactiveDays != null && inactiveDays >= 7 ? (
                  <p className="text-amber-200 text-sm mb-2">
                    התלמיד לא תרגל ביותר מ-7 ימים — מומלץ לעקוב.
                  </p>
                ) : null}
              </>
            )}
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">על מה להתמקד בתרגול הבא</h2>
            {focusItems.length ? (
              <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                {focusItems.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-white/60 text-sm">אין נושאים דחופים כרגע — המשך כרגיל.</p>
            )}
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">אותות אזהרה</h2>
            {riskSignals.length ? (
              <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                {riskSignals.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-white/60 text-sm">לא זוהו אותות אזהרה בתקופה זו.</p>
            )}
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">חוזקות</h2>
            {strengths.length ? (
              <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                {strengths.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-white/60 text-sm">אין מספיק נתונים להצגת חוזקות.</p>
            )}
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">הצעות לתמיכה</h2>
            {suggestions.length ? (
              <ul className="list-disc list-inside text-white/80 text-sm space-y-1">
                {suggestions.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-white/60 text-sm">אין הצעות מיוחדות לתקופה זו.</p>
            )}
          </section>

          <section className="rounded-xl border border-white/15 bg-black/30 p-5 mb-6">
            <h2 className="text-lg font-semibold mb-2">גישת הורה — סיכום</h2>
            {gas.active > 0 ? (
              <p className="text-emerald-300 text-sm">גישה פעילה ({gas.active})</p>
            ) : gas.expired > 0 ? (
              <p className="text-amber-300 text-sm">גישה פגת תוקף</p>
            ) : gas.revoked > 0 ? (
              <p className="text-white/60 text-sm">גישה בוטלה</p>
            ) : (
              <p className="text-white/70 text-sm">לא הוגדרה גישת הורה לתלמיד זה.</p>
            )}
          </section>

          {accessToken ? (
            <GuardianAccessPanel accessToken={accessToken} studentId={studentId} />
          ) : null}
        </TeacherPortalShell>
      </div>
    </Layout>
  );
}
