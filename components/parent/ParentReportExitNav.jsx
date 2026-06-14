import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  SHORT_PARENT_REPORT_ROUTE,
  buildShortParentReportQuery,
  navigateToParentDashboard,
} from "../../lib/parent-report-navigation";
import { parseParentReportRemoteSource } from "../../lib/teacher-portal/parent-report-remote-source";

const BTN_CLASS =
  "inline-flex px-4 py-2 rounded-lg text-sm font-bold bg-white/10 border border-white/20 hover:bg-white/20 text-white transition-all";

/**
 * Top navigation for parent report pages — opposite corners (RTL):
 * ימין: חזור לדוח הורים | שמאל: חזרה לפורטל הורים
 */
export function ParentReportExitNav({ className = "", showShortReportLink = true }) {
  const router = useRouter();
  const remote = useMemo(
    () => parseParentReportRemoteSource(router),
    [router.isReady, router.query.source, router.query.studentId]
  );
  const shortReportQuery = useMemo(() => buildShortParentReportQuery(router), [router.query]);

  if (remote.isTeacher && remote.studentId) {
    return (
      <div className={`no-pdf flex items-center justify-between gap-2 w-full ${className}`.trim()}>
        <Link href={`/teacher/student/${remote.studentId}`} className={BTN_CLASS}>
          חזרה לדוח מורה
        </Link>
        <Link href="/teacher/dashboard" className={BTN_CLASS}>
          לוח בקרה
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`no-pdf flex items-center gap-2 w-full ${
        showShortReportLink ? "justify-between" : "justify-start"
      } ${className}`.trim()}
    >
      {showShortReportLink ? (
        <Link
          href={{ pathname: SHORT_PARENT_REPORT_ROUTE, query: shortReportQuery }}
          prefetch={false}
          className={BTN_CLASS}
        >
          חזור לדוח הורים
        </Link>
      ) : null}
      <button type="button" onClick={() => navigateToParentDashboard(router)} className={BTN_CLASS}>
        חזרה לפורטל הורים
      </button>
    </div>
  );
}
