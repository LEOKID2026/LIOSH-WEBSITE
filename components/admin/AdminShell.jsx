import Link from "next/link";
import { useAdminLogout } from "../../lib/admin-portal/use-admin-session.js";
import {
  ADMIN_LOGOUT,
  ADMIN_LOGOUT_BUSY,
  ADMIN_NAV_TEACHERS,
  ADMIN_NAV_TEACHER_PORTAL,
  ADMIN_PLATFORM_LABEL,
} from "../../lib/admin-portal/admin-ui.he.js";

/** Wide centered admin console column — not full bleed, not article-narrow. */
export const ADMIN_PAGE_CONTAINER =
  "max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-10";

export default function AdminShell({ title, header, children, showLogout = false }) {
  const { logout, busy } = useAdminLogout();

  return (
    <div className={`${ADMIN_PAGE_CONTAINER} text-white`} dir="rtl" lang="he">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/15 pb-4">
        {header ? (
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white/50 mb-1">{ADMIN_PLATFORM_LABEL}</p>
            {header}
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white/50 mb-1">{ADMIN_PLATFORM_LABEL}</p>
            <h1 className="text-xl md:text-2xl font-bold text-right">{title}</h1>
          </div>
        )}
        <nav
          className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm shrink-0 w-full sm:w-auto justify-end"
          aria-label="ניווט מנהל"
        >
          <Link href="/admin/teachers" className="text-amber-300 hover:underline font-medium px-1">
            {ADMIN_NAV_TEACHERS}
          </Link>
          <Link href="/teacher/dashboard" className="text-white/60 hover:underline px-1">
            {ADMIN_NAV_TEACHER_PORTAL}
          </Link>
          {showLogout ? (
            <button
              type="button"
              onClick={() => void logout()}
              disabled={busy}
              className="rounded-lg border border-white/25 bg-white/10 hover:bg-white/15 px-3 py-1.5 font-semibold text-white disabled:opacity-60 min-h-[2rem]"
            >
              {busy ? ADMIN_LOGOUT_BUSY : ADMIN_LOGOUT}
            </button>
          ) : null}
        </nav>
      </header>
      {children}
    </div>
  );
}
