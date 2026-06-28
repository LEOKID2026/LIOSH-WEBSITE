import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import StudentThemePicker from "../student/StudentThemePicker.jsx";
import {
  SHORT_PARENT_REPORT_ROUTE,
  buildShortParentReportQuery,
  navigateToParentDashboard,
} from "../../lib/parent-report-navigation";
import { parseParentReportRemoteSource } from "../../lib/teacher-portal/parent-report-remote-source";

const BTN_CLASS_DARK =
  "parent-report-exit-nav-btn inline-flex px-4 py-2 rounded-lg text-sm font-bold bg-white/10 border border-white/20 hover:bg-white/20 text-white transition-all";

const BTN_CLASS_BRIGHT =
  "parent-report-exit-nav-btn inline-flex px-4 py-2 rounded-lg text-sm font-bold border border-sky-200 bg-white text-slate-800 hover:bg-sky-50 hover:border-sky-300 shadow-sm transition-all";

export function ParentReportThemeIcons({ className = "" }) {
  return (
    <div className={`shrink-0 pointer-events-auto ${className}`.trim()}>
      <StudentThemePicker variant="icon" iconSize="nav" />
    </div>
  );
}

/**
 * Top navigation for parent report pages — opposite corners (RTL):
 * ימין: חזור לדוח הורים | שמאל: חזרה לפורטל הורים
 */
export function ParentReportExitNav({ className = "", showShortReportLink = true, isBright = false }) {
  const btnClass = isBright ? BTN_CLASS_BRIGHT : BTN_CLASS_DARK;
  const router = useRouter();
  const remote = useMemo(
    () => parseParentReportRemoteSource(router),
    [router.isReady, router.query.source, router.query.studentId]
  );
  const shortReportQuery = useMemo(() => buildShortParentReportQuery(router), [router.query]);

  if (remote.isTeacher && remote.studentId) {
    return (
      <div className={`no-pdf relative flex items-center justify-between gap-2 w-full ${className}`.trim()}>
        <Link href={`/teacher/student/${remote.studentId}`} className={btnClass}>
          חזרה לדוח מורה
        </Link>
        <ParentReportThemeIcons className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
        <Link href="/teacher/dashboard" className={btnClass}>
          לוח בקרה
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`no-pdf relative flex items-center gap-2 w-full ${
        showShortReportLink ? "justify-between" : "justify-end"
      } ${className}`.trim()}
    >
      {showShortReportLink ? (
        <Link
          href={{ pathname: SHORT_PARENT_REPORT_ROUTE, query: shortReportQuery }}
          prefetch={false}
          className={btnClass}
        >
          חזור לדוח הורים
        </Link>
      ) : null}
      <ParentReportThemeIcons className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
      <button type="button" onClick={() => navigateToParentDashboard(router)} className={btnClass}>
        חזרה לפורטל הורים
      </button>
    </div>
  );
}
