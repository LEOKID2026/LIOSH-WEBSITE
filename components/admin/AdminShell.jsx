import Link from "next/link";
import {
  ADMIN_NAV_TEACHERS,
  ADMIN_NAV_TEACHER_PORTAL,
  ADMIN_PLATFORM_LABEL,
} from "../../lib/admin-portal/admin-ui.he.js";

/** Wide centered admin console column — not full bleed, not article-narrow. */
export const ADMIN_PAGE_CONTAINER =
  "max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-10";

export default function AdminShell({ title, children }) {
  return (
    <div className={`${ADMIN_PAGE_CONTAINER} text-white`} dir="rtl" lang="he">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/15 pb-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white/50 mb-1">{ADMIN_PLATFORM_LABEL}</p>
          <h1 className="text-xl md:text-2xl font-bold text-right">{title}</h1>
        </div>
        <nav className="flex flex-wrap gap-3 text-sm shrink-0">
          <Link href="/admin/teachers" className="text-amber-300 hover:underline font-medium">
            {ADMIN_NAV_TEACHERS}
          </Link>
          <Link href="/teacher/dashboard" className="text-white/60 hover:underline">
            {ADMIN_NAV_TEACHER_PORTAL}
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
