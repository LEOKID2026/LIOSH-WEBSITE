import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Layout from "../Layout";
import SubjectSummaryCards from "../teacher-portal/SubjectSummaryCards";
import TeacherPortalShell from "../teacher-portal/TeacherPortalShell";
import ParentReportParentSections from "./ParentReportParentSections";
import ParentMustChangePinGate from "./ParentMustChangePinGate";
import {
  SC_MINI_REPORT_CARD_TITLE,
  SC_MINI_REPORT_LINK_FULL,
  SC_MINI_REPORT_NO_DATA,
  SC_NAV_SCHOOL_INBOX_PARENT,
} from "../../lib/school-portal/school-communication.he";
import { formatDateHe } from "../../lib/teacher-portal/teacher-ui.he.js";
import { formatParentReportSubjectHe } from "../../utils/parent-report-language/parent-report-display-labels.he.js";

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
  const [mustChangePin, setMustChangePin] = useState(false);
  const [pinGateDone, setPinGateDone] = useState(false);
  const [isSchoolLinked, setIsSchoolLinked] = useState(false);
  const [miniReport, setMiniReport] = useState(null);
  const [schoolUnread, setSchoolUnread] = useState(0);

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
      const schoolLinked = Boolean(me.body.data.isSchoolLinked);
      setStudentId(sid);
      setExpiresAt(me.body.data.expiresAt || null);
      setIsSchoolLinked(schoolLinked);
      setMustChangePin(schoolLinked && Boolean(me.body.data.mustChangePin));
      setPinGateDone(!schoolLinked || !me.body.data.mustChangePin);
      setLoadingHint("הדוח נטען - זה עשוי לקחת כמה שניות.");

      if (schoolLinked) {
        const inboxRes = await fetch("/api/guardian/school-messages", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (inboxRes.ok) {
          const inboxBody = await inboxRes.json().catch(() => ({}));
          setSchoolUnread(inboxBody?.data?.unreadCount ?? 0);
        }

        const miniRes = await fetch(
          `/api/parent/mini-report?studentId=${encodeURIComponent(sid)}&windowDays=30`,
          { credentials: "same-origin", cache: "no-store" }
        );
        if (miniRes.ok) {
          const miniBody = await miniRes.json().catch(() => ({}));
          setMiniReport(miniBody?.data?.miniReport || null);
        }
      }

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

  if (isSchoolLinked && mustChangePin && !pinGateDone) {
    return (
      <Layout>
        <TeacherPortalShell title="שינוי קוד גישה">
          <ParentMustChangePinGate onSuccess={() => setPinGateDone(true)} />
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

          {isSchoolLinked ? (
            <div className="flex flex-wrap gap-3 mb-4">
              <Link
                href="/parent/school-inbox"
                className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 hover:bg-amber-500/20"
              >
                {SC_NAV_SCHOOL_INBOX_PARENT}
                {schoolUnread > 0 ? ` (${schoolUnread})` : ""}
              </Link>
            </div>
          ) : null}

          {isSchoolLinked && miniReport ? (
            <section className="rounded-xl border border-white/15 bg-black/30 p-5 mb-6">
              <h2 className="text-lg font-semibold mb-3">{SC_MINI_REPORT_CARD_TITLE}</h2>
              {miniReport.subjectSummary?.length ? (
                <ul className="text-sm space-y-2 mb-3">
                  {miniReport.subjectSummary.map((s) => (
                    <li key={s.subjectKey} className="flex justify-between gap-2">
                      <span>{formatParentReportSubjectHe(s.subjectKey)}</span>
                      <span className="text-white/60">
                        {Math.round((s.accuracy || 0) * 100)}% · {s.answers} תשובות
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-white/50 mb-3">{SC_MINI_REPORT_NO_DATA}</p>
              )}
              <p className="text-xs text-amber-300">{SC_MINI_REPORT_LINK_FULL}</p>
            </section>
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

          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3">ביצועים לפי מקצוע</h2>
            <SubjectSummaryCards subjects={report?.subjects} />
          </section>

          <ParentReportParentSections report={report} compact />
        </TeacherPortalShell>
      </div>
    </Layout>
  );
}
