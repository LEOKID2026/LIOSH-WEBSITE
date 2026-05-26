import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client.js";
import {
  SCHOOL_NAV_CLASSES,
  SCHOOL_NAV_DASHBOARD,
  SCHOOL_NAV_MY_TEACHER,
  SCHOOL_NAV_STUDENTS,
  SCHOOL_NAV_TEACHERS,
  SCHOOL_PLATFORM_LABEL,
} from "../../lib/school-portal/school-ui.he.js";

export const SCHOOL_PAGE_CONTAINER =
  "max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-10";

export default function SchoolPortalShell({
  title,
  schoolName,
  showTeacherDashboardLink = false,
  children,
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    try {
      const supabase = getLearningSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace("/teacher/login");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${SCHOOL_PAGE_CONTAINER} text-white`} dir="rtl" lang="he">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/15 pb-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white/50 mb-1">{SCHOOL_PLATFORM_LABEL}</p>
          {schoolName ? (
            <p className="text-sm text-amber-200/90 mb-1">{schoolName}</p>
          ) : null}
          {title ? <h1 className="text-xl md:text-2xl font-bold text-right">{title}</h1> : null}
        </div>
        <nav
          className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm shrink-0 w-full sm:w-auto justify-end"
          aria-label="ניווט בית ספר"
        >
          <Link href="/school/dashboard" className="text-amber-300 hover:underline px-1">
            {SCHOOL_NAV_DASHBOARD}
          </Link>
          <Link href="/school/teachers" className="text-white/70 hover:underline px-1">
            {SCHOOL_NAV_TEACHERS}
          </Link>
          <Link href="/school/classes" className="text-white/70 hover:underline px-1">
            {SCHOOL_NAV_CLASSES}
          </Link>
          <Link href="/school/students" className="text-white/70 hover:underline px-1">
            {SCHOOL_NAV_STUDENTS}
          </Link>
          {showTeacherDashboardLink ? (
            <Link href="/teacher/dashboard" className="text-emerald-300 hover:underline px-1">
              {SCHOOL_NAV_MY_TEACHER}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void logout()}
            disabled={busy}
            className="rounded-lg border border-white/25 bg-white/10 hover:bg-white/15 px-3 py-1.5 font-semibold text-white disabled:opacity-60 min-h-[2rem]"
          >
            {busy ? "יוצא…" : "יציאה"}
          </button>
        </nav>
      </header>
      {children}
    </div>
  );
}
