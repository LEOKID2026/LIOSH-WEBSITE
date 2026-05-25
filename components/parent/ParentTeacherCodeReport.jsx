import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../Layout";
import SubjectSummaryCards from "../teacher-portal/SubjectSummaryCards";
import TeacherPortalShell from "../teacher-portal/TeacherPortalShell";
import { formatDateHe } from "../../lib/teacher-portal/teacher-ui.he.js";

async function fetchGuardianMe() {
  const res = await fetch("/api/guardian/me", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function fetchGuardianReport(studentId) {
  const res = await fetch(
    `/api/guardian/student/${encodeURIComponent(studentId)}/report-data?studentId=${encodeURIComponent(studentId)}`,
    { method: "GET", credentials: "same-origin", cache: "no-store" }
  );
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

/**
 * Limited child report for teacher-issued parent access (הורה + קוד מהמורה).
 *
 * @param {{ loginRedirectPath?: string, logoutRedirectPath?: string }} props
 */
export default function ParentTeacherCodeReport({
  loginRedirectPath = "/parent/login",
  logoutRedirectPath = "/parent/login",
}) {
  const router = useRouter();
  const [state, setState] = useState("loading");
  const [loadingHint, setLoadingHint] = useState("מאמת חיבור…");
  const [studentId, setStudentId] = useState(null);
  const [report, setReport] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const me = await fetchGuardianMe();
      if (!mounted) return;

      if (me.status === 401 || me.status === 503) {
        if (typeof window !== "undefined") {
          window.location.assign(loginRedirectPath);
        } else {
          router.replace(loginRedirectPath);
        }
        return;
      }

      if (me.status !== 200 || !me.body?.data?.studentId) {
        setState("error");
        return;
      }

      const sid = me.body.data.studentId;
      setStudentId(sid);
      setExpiresAt(me.body.data.expiresAt || null);
      setLoadingHint("הדוח נטען — זה עשוי לקחת כמה שניות.");

      const reportRes = await fetchGuardianReport(sid);
      if (!mounted) return;

      if (reportRes.status === 403) {
        setState("scope_violation");
        return;
      }

      const envelope = reportRes.body || {};
      const reportPayload =
        envelope.report && typeof envelope.report === "object" ? envelope.report : envelope;

      if (reportRes.status !== 200 || envelope.ok !== true) {
        setState("report_error");
        return;
      }

      setReport({
        ...reportPayload,
        student: envelope.student || reportPayload.student || null,
        range: envelope.range || reportPayload.range || null,
        reportMeta: envelope.reportMeta || reportPayload.reportMeta || null,
      });
      setState("ready");
    }

    load();
    return () => {
      mounted = false;
    };
  }, [router, loginRedirectPath]);

  const onLogout = async () => {
    await fetch("/api/guardian/logout", { method: "POST", credentials: "same-origin" });
    router.replace(logoutRedirectPath);
  };

  const studentName =
    report?.student?.full_name || report?.accountSnapshot?.displayName || "הילד";
  const summary = report?.summary || {};
  const lastDate = report?.dailyActivity?.length
    ? [...report.dailyActivity].sort((a, b) => b.date.localeCompare(a.date))[0]?.date
    : null;

  let expiryWarning = null;
  if (expiresAt) {
    const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
    if (daysLeft <= 7 && daysLeft >= 0) {
      expiryWarning = `הגישה שלכם לדוח זה תפוג בקרוב (${formatDateHe(expiresAt)}). פנו למורה לחידוש.`;
    }
  }

  if (state === "loading") {
    return (
      <Layout>
        <TeacherPortalShell title="דוח ילד">
          <p className="text-white/60" role="status">{loadingHint}</p>
        </TeacherPortalShell>
      </Layout>
    );
  }

  if (state === "error") {
    return (
      <Layout>
        <TeacherPortalShell>
          <p className="text-red-300" role="alert">
            אירעה שגיאה. נסו להיכנס שנית דרך{" "}
            <a href={loginRedirectPath} className="text-amber-300 underline">
              דף כניסת הורה
            </a>
            .
          </p>
        </TeacherPortalShell>
      </Layout>
    );
  }

  if (state === "scope_violation") {
    return (
      <Layout>
        <TeacherPortalShell>
          <p className="text-red-300" role="alert">
            אין לכם גישה לדוח זה.
          </p>
        </TeacherPortalShell>
      </Layout>
    );
  }

  if (state === "report_error") {
    return (
      <Layout>
        <TeacherPortalShell>
          <p className="text-red-300" role="alert">
            לא ניתן לטעון את הדוח כרגע. רעננו את הדף ונסו שוב.
          </p>
        </TeacherPortalShell>
      </Layout>
    );
  }

  return (
    <Layout>
      <div
        data-testid="parent-teacher-code-report-root"
        data-state="ready"
        data-student-id={studentId || ""}
        data-report-ok="1"
      >
        <div
          className="bg-amber-500/15 border border-amber-500/40 text-amber-100 text-sm px-4 py-3 rounded-lg mb-6"
          role="status"
        >
          אתם צופים בדוח מוגבל שהוגדר עבורכם על ידי המורה. גישה זו מוגבלת לילד אחד בלבד.
        </div>

        <TeacherPortalShell title={`דוח הלמידה של ${studentName}`}>
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={onLogout}
              className="text-sm px-3 py-1.5 rounded border border-white/20 hover:bg-white/10"
            >
              יציאה
            </button>
          </div>

          {expiryWarning ? (
            <p className="text-amber-200 text-sm mb-4">⚠ {expiryWarning}</p>
          ) : null}

          <section className="rounded-xl border border-white/15 bg-black/30 p-5 mb-6">
            <h2 className="text-lg font-semibold mb-3">סיכום פעילות</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-white/60">מפגשי תרגול</dt>
                <dd>{summary.totalSessions ?? 0}</dd>
              </div>
              <div>
                <dt className="text-white/60">פעיל לאחרונה</dt>
                <dd>{lastDate ? formatDateHe(lastDate) : "לא היה תרגול בתקופה האחרונה."}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">ביצועים לפי מקצוע</h2>
            <SubjectSummaryCards subjects={report?.subjects} />
          </section>
        </TeacherPortalShell>
      </div>
    </Layout>
  );
}
