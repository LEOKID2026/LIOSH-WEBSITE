import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { getLearningSupabaseBrowserClient } from "../../lib/learning-supabase/client.js";
import {
  SCHOOL_NAV_CLASSES,
  SCHOOL_NAV_DASHBOARD,
  SCHOOL_NAV_MY_TEACHER,
  SCHOOL_NAV_OPERATOR_DASHBOARD,
  SCHOOL_NAV_STUDENTS,
  SCHOOL_NAV_TEACHERS,
  SCHOOL_NAV_OPERATORS,
  SCHOOL_PLATFORM_LABEL,
} from "../../lib/school-portal/school-ui.he.js";
import { SC_NAV_MESSAGES } from "../../lib/school-portal/school-communication.he";

export const SCHOOL_PAGE_CONTAINER =
  "max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-10";

const NAV_ITEMS_MANAGER = [
  { href: "/school/dashboard", label: SCHOOL_NAV_DASHBOARD },
  { href: "/school/teachers", label: SCHOOL_NAV_TEACHERS },
  { href: "/school/operators", label: SCHOOL_NAV_OPERATORS },
  { href: "/school/classes", label: SCHOOL_NAV_CLASSES },
  { href: "/school/students", label: SCHOOL_NAV_STUDENTS },
  { href: "/school/messages", label: SC_NAV_MESSAGES },
];

function buildOperatorNavItems(operatorGrants = {}) {
  const items = [{ href: "/school/operator/dashboard", label: SCHOOL_NAV_OPERATOR_DASHBOARD }];
  if (operatorGrants.studentAccessAdmin || operatorGrants.studentDataViewer) {
    items.push({ href: "/school/students", label: SCHOOL_NAV_STUDENTS });
  }
  return items;
}

function navLinkClass(active) {
  return active
    ? "block rounded-lg bg-amber-500/20 border border-amber-500/35 text-amber-200 font-semibold px-3 py-2.5 text-sm"
    : "block rounded-lg border border-transparent text-white/75 hover:bg-white/5 hover:text-white px-3 py-2.5 text-sm transition-colors";
}

export default function SchoolPortalShell({
  title,
  subtitle,
  schoolName,
  showTeacherDashboardLink = false,
  portalRole = "school_manager",
  authMethod = "supabase_jwt",
  operatorGrants = null,
  children,
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const navItems = useMemo(() => {
    if (portalRole === "school_manager") return NAV_ITEMS_MANAGER;
    if (portalRole === "school_operator") return buildOperatorNavItems(operatorGrants || {});
    return [];
  }, [portalRole, operatorGrants]);

  const logout = async () => {
    setBusy(true);
    try {
      if (authMethod === "staff_cookie") {
        await fetch("/api/school/staff/logout", {
          method: "POST",
          credentials: "same-origin",
        });
        router.replace("/school/staff/login");
        return;
      }
      const supabase = getLearningSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace("/teacher/login");
    } finally {
      setBusy(false);
    }
  };

  const path = router.pathname;
  const navLabel = portalRole === "school_operator" ? "תפריט תפעול" : "תפריט ניהול";

  /**
   * Site Layout HUD uses flex + justify-between; without document RTL (see Layout.js
   * layoutRtlHebrew paths), /school/* renders logo left / menu right. Scope stays here
   * so global Layout is unchanged.
   */
  useEffect(() => {
    const html = document.documentElement;
    const prevDir = html.getAttribute("dir");
    const prevLang = html.getAttribute("lang");
    html.setAttribute("dir", "rtl");
    html.setAttribute("lang", "he");
    return () => {
      if (prevDir) html.setAttribute("dir", prevDir);
      else html.removeAttribute("dir");
      if (prevLang) html.setAttribute("lang", prevLang);
      else html.removeAttribute("lang");
    };
  }, []);

  return (
    <div className={`${SCHOOL_PAGE_CONTAINER} text-white`} dir="rtl" lang="he">
      <header className="mb-6 lg:mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-white/15 pb-4">
        <div className="min-w-0 flex-1 text-right">
          <p className="text-xs text-white/50 mb-1">{SCHOOL_PLATFORM_LABEL}</p>
          {schoolName ? (
            <p className="text-sm sm:text-base text-amber-200/95 font-medium mb-1">{schoolName}</p>
          ) : null}
          {title ? <h1 className="text-xl md:text-2xl font-bold text-right">{title}</h1> : null}
          {subtitle ? <p className="text-sm text-white/55 mt-1 text-right max-w-2xl">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          {showTeacherDashboardLink ? (
            <Link
              href="/teacher/dashboard"
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 px-3 py-1.5 text-sm font-medium"
            >
              {SCHOOL_NAV_MY_TEACHER}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void logout()}
            disabled={busy}
            className="rounded-lg border border-white/25 bg-white/10 hover:bg-white/15 px-3 py-1.5 font-semibold text-white disabled:opacity-60 min-h-[2rem] text-sm"
          >
            {busy ? "יוצא…" : "יציאה"}
          </button>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
        <aside className="lg:sticky lg:top-6">
          <nav
            className="rounded-xl border border-white/15 bg-black/25 p-2 space-y-1"
            aria-label="ניווט בית ספר"
          >
            <p className="text-xs text-white/45 px-3 pt-1 pb-2 hidden lg:block">{navLabel}</p>
            <div className="flex flex-wrap lg:flex-col gap-1 pb-1 lg:pb-0">
              {navItems.map((item) => {
                const active =
                  path === item.href || (item.href !== "/school/dashboard" && path.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} className={`${navLinkClass(active)} whitespace-nowrap`}>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
