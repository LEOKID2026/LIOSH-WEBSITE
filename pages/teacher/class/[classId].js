import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../../../components/Layout";
import SubjectSummaryCards from "../../../components/teacher-portal/SubjectSummaryCards";
import TeacherPortalShell from "../../../components/teacher-portal/TeacherPortalShell";
import { getLearningSupabaseBrowserClient } from "../../../lib/learning-supabase/client";
import {
  attentionReasonHe,
  classHealthHe,
  formatPercent,
  formatTopicLineHe,
  groupTierHe,
  subjectLabelHe,
  teacherAuthFetch,
} from "../../../lib/teacher-portal/teacher-ui.he.js";

export async function getServerSideProps(context) {
  const classId = String(context.params?.classId || "").trim();
  return { props: { classId } };
}

export default function TeacherClassReportPage({ classId }) {
  const router = useRouter();
  const supabaseRef = useRef(null);
  const [state, setState] = useState("loading");
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!classId) {
      setState("invalid_class");
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
        `/api/teacher/classes/${encodeURIComponent(classId)}/report-data?classId=${encodeURIComponent(classId)}`
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
      if (res.status !== 200 || body?.ok !== true) {
        setState("load_error");
        return;
      }

      setReport(body);
      setState("ready");
    }

    load();
    return () => {
      mounted = false;
    };
  }, [router, classId]);

  if (state === "loading") {
    return (
      <Layout>
        <TeacherPortalShell backHref="/teacher/dashboard" title="דוח כיתה">
          <p className="text-white/60">טוען…</p>
        </TeacherPortalShell>
      </Layout>
    );
  }

  if (state === "invalid_class") {
    return (
      <Layout>
        <TeacherPortalShell backHref="/teacher/dashboard">
          <p className="text-red-300" role="alert">
            מזהה כיתה שגוי.
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
            אין לך הרשאה לצפות בדוח כיתה זו.
          </p>
        </TeacherPortalShell>
      </Layout>
    );
  }

  if (state === "load_error" || !report) {
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

  const className = report.class?.name || "כיתה";
  const cohort = report.cohortSummary || {};
  const guidance = report.teacherGuidanceBlock || {};
  const teacherSummary = guidance.teacherSummary || {};
  const attentionList =
    guidance.attentionStudents || report.attentionList || [];
  const weaknessTopics = report.weaknessTopics || guidance.priorityTopics || [];
  const groups = guidance.suggestedGroups || {};
  const memberCount = report.roster?.activeMemberCount ?? 0;

  const reinforcement = (guidance.reinforcementSuggestions || [])
    .map((t) => {
      const line = formatTopicLineHe(t.subject, t.topic);
      if (line) return `מומלץ לחזק: ${line}`;
      const lab = subjectLabelHe(t.subject);
      return lab ? `מומלץ לחזק את ${lab} בכיתה` : null;
    })
    .filter(Boolean);
  const extension = (guidance.extensionSuggestions || [])
    .map((t) => {
      const lab = subjectLabelHe(t.subject);
      return lab
        ? `${lab} — ביצועים טובים בכיתה (${formatPercent(t.accuracy)})`
        : null;
    })
    .filter(Boolean);

  return (
    <Layout>
      <div
        data-testid="teacher-class-report-root"
        data-state="ready"
        data-class-id={classId}
        data-report-ok="true"
        data-member-count={String(memberCount)}
      >
        <TeacherPortalShell backHref="/teacher/dashboard" title={`דוח כיתה: ${className}`}>
          <p className="text-white/60 text-sm mb-2">
            {memberCount} תלמידים פעילים · נתונים מ-30 הימים האחרונים
          </p>

          {memberCount === 0 ? (
            <p className="text-amber-200 text-sm mb-6">
              הכיתה ריקה — הוסף תלמידים כדי לראות דוח.
            </p>
          ) : null}

          <section className="rounded-xl border border-white/15 bg-black/30 p-5 mb-6">
            <h2 className="text-lg font-semibold mb-3">סיכום כיתה</h2>
            {guidance.insufficientData && cohort.totalAnswers < 10 ? (
              <p className="text-white/70 text-sm">
                לא ניתן לחשב המלצות — אין מספיק נתונים בתקופה זו.
              </p>
            ) : (
              <>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-3">
                  <div>
                    <dt className="text-white/60">סה״כ מפגשי תרגול</dt>
                    <dd>{cohort.totalSessions ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-white/60">סה״כ תשובות</dt>
                    <dd>{cohort.totalAnswers ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-white/60">אחוז הצלחה ממוצע</dt>
                    <dd>{formatPercent(cohort.accuracy)}</dd>
                  </div>
                  <div>
                    <dt className="text-white/60">תלמידים עם נתונים</dt>
                    <dd>{cohort.studentsWithActivity ?? 0}</dd>
                  </div>
                </dl>
                {classHealthHe(teacherSummary.classHealthSignal) ? (
                  <p className="text-amber-200 text-sm">
                    {classHealthHe(teacherSummary.classHealthSignal)}
                  </p>
                ) : null}
              </>
            )}
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">ביצועי הכיתה לפי מקצוע</h2>
            <SubjectSummaryCards subjects={report.subjects} />
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">נושאים שדורשים חיזוק</h2>
            {weaknessTopics.length ? (
              <ul className="text-sm text-white/80 space-y-2">
                {weaknessTopics.slice(0, 10).map((t, i) => {
                  const line = formatTopicLineHe(t.subject, t.topic);
                  const acc =
                    t.answers > 0
                      ? formatPercent(((t.wrong || 0) / t.answers) * 100)
                      : "—";
                  return (
                    <li key={i}>
                      {line || subjectLabelHe(t.subject) || "נושא"}: {acc} שגיאות ממוצע
                      {t.studentCount ? ` · ${t.studentCount} תלמידים` : ""}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-white/60 text-sm">לא זוהו נושאים בעייתיים בתקופה זו.</p>
            )}
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">תלמידים שדורשים מעקב</h2>
            {attentionList.length ? (
              <ul className="space-y-2">
                {attentionList.map((s) => (
                  <li
                    key={s.studentId}
                    className="flex flex-wrap justify-between gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  >
                    <div>
                      <span>{s.studentFullName || s.studentFullNameMasked}</span>
                      <span className="text-white/50 mr-2">
                        {(s.reasons || [])
                          .map(attentionReasonHe)
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                    <Link
                      href={`/teacher/student/${s.studentId}`}
                      className="text-amber-300 hover:underline"
                    >
                      צפה בדוח
                    </Link>
                  </li>
                ))}
              </ul>
            ) : memberCount > 0 ? (
              <p className="text-white/60 text-sm">
                כל תלמידי הכיתה בסדר — אין צורך בהתערבות מיוחדת.
              </p>
            ) : null}
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">קבוצות עבודה מוצעות</h2>
            {["struggling", "on_track", "advanced"].map((tier) => {
              const list = groups[tier] || [];
              if (!list.length) return null;
              return (
                <div key={tier} className="mb-2 text-sm">
                  <span className="font-semibold text-amber-200">
                    {groupTierHe(tier)} ({list.length} תלמידים):
                  </span>{" "}
                  <span className="text-white/70">
                    {list.map((x) => x.studentFullName || x.studentFullNameMasked).join("، ")}
                  </span>
                </div>
              );
            })}
            {!groups.struggling?.length &&
            !groups.on_track?.length &&
            !groups.advanced?.length ? (
              <p className="text-white/60 text-sm">
                {memberCount < 3
                  ? "אין מספיק תלמידים עם נתונים להרכבת קבוצות."
                  : "אין מספיק נתונים להרכבת קבוצות."}
              </p>
            ) : (
              <p className="text-xs text-white/50 mt-2">
                *קבוצות מחושבות על בסיס ביצועים — המורה מחליט סופית.
              </p>
            )}
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">מיקוד השיעור הבא</h2>
            {(guidance.nextLessonFocus || []).length ? (
              <ul className="list-disc list-inside text-sm text-white/80 space-y-1">
                {guidance.nextLessonFocus.map((f, i) => {
                  const line = formatTopicLineHe(f.subject, f.topic);
                  return (
                    <li key={i}>
                      {line || subjectLabelHe(f.subject)}
                      {f.affectedStudents
                        ? ` — ${f.affectedStudents} תלמידים התקשו בנושא זה`
                        : ""}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-white/60 text-sm">
                אין נושא בולט לשיעור הבא — המשך לפי תכנית הלימודים.
              </p>
            )}
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">הצעות לחיזוק</h2>
            {reinforcement.length ? (
              <ul className="list-disc list-inside text-sm text-white/80">
                {reinforcement.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-white/60 text-sm">אין הצעות חיזוק מיוחדות לתקופה זו.</p>
            )}
          </section>

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2">הצעות להעשרה</h2>
            {extension.length ? (
              <ul className="list-disc list-inside text-sm text-white/80">
                {extension.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-white/60 text-sm">אין הצעות העשרה לתקופה זו.</p>
            )}
          </section>
        </TeacherPortalShell>
      </div>
    </Layout>
  );
}
