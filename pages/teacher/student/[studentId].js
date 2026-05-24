import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import GuardianAccessPanel from "../../../components/teacher-portal/GuardianAccessPanel";
import SubjectSummaryCards from "../../../components/teacher-portal/SubjectSummaryCards";
import TeacherPortalShell from "../../../components/teacher-portal/TeacherPortalShell";
import { getLearningSupabaseBrowserClient } from "../../../lib/learning-supabase/client";
import {
  formatDateHe,
  formatPercent,
  formatTopicLineHe,
  riskLevelHe,
  riskSignalHe,
  subjectLabelHe,
  supportSuggestionHe,
  teacherAuthFetch,
} from "../../../lib/teacher-portal/teacher-ui.he.js";

export async function getServerSideProps(context) {
  const studentId = String(context.params?.studentId || "").trim();
  return { props: { studentId } };
}

export default function TeacherStudentReportPage({ studentId }) {
  const router = useRouter();
  const supabaseRef = useRef(null);
  const [state, setState] = useState("loading");
  const [report, setReport] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!studentId) {
      setState("invalid_student");
      return;
    }
    if (!supabaseRef.current) {
      supabaseRef.current = getLearningSupabaseBrowserClient();
    }

    let mounted = true;

    async function load() {
      const supabase = supabaseRef.current;
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) {
        if (mounted) router.replace("/teacher/login");
        return;
      }

      const res = await teacherAuthFetch(
        token,
        `/api/teacher/students/${encodeURIComponent(studentId)}/report-data?studentId=${encodeURIComponent(studentId)}`
      );
      const body = await res.json().catch(() => ({}));
      if (!mounted) return;

      if (res.status === 401) {
        await supabase.auth.signOut();
        router.replace("/teacher/login");
        return;
      }
      if (res.status === 403 || res.status === 404) {
        setState("forbidden");
        return;
      }
      if (res.status !== 200 || !body?.summary) {
        setState("load_error");
        return;
      }

      setAccessToken(token);
      setReport(body);
      setState("ready");
    }

    load();
    return () => {
      mounted = false;
    };
  }, [router, studentId]);

  const studentName =
    report?.student?.full_name || report?.accountSnapshot?.displayName || "תלמיד";
  const guidance = report?.teacherGuidanceBlock || {};
  const tg = guidance.teacherGuidance || {};
  const summary = report?.summary || {};
  const gas = report?.guardianAccessSummary || {};

  if (state === "loading") {
    return (
      <Layout>
        <TeacherPortalShell backHref="/teacher/dashboard" title="דוח תלמיד">
          <p className="text-white/60">טוען…</p>
        </TeacherPortalShell>
      </Layout>
    );
  }

  if (state === "invalid_student") {
    return (
      <Layout>
        <TeacherPortalShell backHref="/teacher/dashboard">
          <p className="text-red-300" role="alert">
            מזהה תלמיד שגוי.
          </p>
        </TeacherPortalShell>
      </Layout>
    );
  }

  if (state === "forbidden") {
    return (
      <Layout>
        <TeacherPortalShell backHref="/teacher/dashboard">
          <p className="text-red-300" role="alert">
            אין לך הרשאה לצפות בדוח תלמיד זה.
          </p>
        </TeacherPortalShell>
      </Layout>
    );
  }

  if (state === "load_error") {
    return (
      <Layout>
        <TeacherPortalShell backHref="/teacher/dashboard">
          <p className="text-red-300" role="alert">
            אירעה שגיאה בטעינת הדוח. רענן ונסה שנית.
          </p>
        </TeacherPortalShell>
      </Layout>
    );
  }

  const inactiveDays = tg.inactiveDays;
  const riskSignals = (guidance.riskSignals || [])
    .map(riskSignalHe)
    .filter(Boolean);
  const strengths = (guidance.strengthsForTeacher || []).map((s) => {
    const line = formatTopicLineHe(s.subject, s.topic);
    return line ? `${line} — ${formatPercent(s.accuracy)} הצלחה` : null;
  }).filter(Boolean);
  const suggestions = (guidance.supportSuggestions || [])
    .map(supportSuggestionHe)
    .filter(Boolean);
  const focusItems = (guidance.nextPracticeFocus || []).map((f) => {
    const line = formatTopicLineHe(f.subject, f.topic);
    return line || subjectLabelHe(f.subject);
  }).filter(Boolean);

  return (
    <Layout>
      <div
        data-testid="teacher-student-report-root"
        data-state="ready"
        data-student-id={studentId}
        data-report-ok="true"
      >
        <TeacherPortalShell
          backHref="/teacher/dashboard"
          title={`דוח תלמיד: ${studentName}`}
        >
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
                    ⚠ התלמיד לא תרגל ביותר מ-7 ימים — מומלץ לעקוב.
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
              <p className="text-emerald-300 text-sm">
                גישה פעילה ({gas.active})
              </p>
            ) : gas.expired > 0 ? (
              <p className="text-amber-300 text-sm">גישה פגת תוקף</p>
            ) : gas.revoked > 0 ? (
              <p className="text-white/60 text-sm">גישה בוטלה</p>
            ) : (
              <p className="text-white/70 text-sm">
                לא הוגדרה גישת הורה לתלמיד זה.
              </p>
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
