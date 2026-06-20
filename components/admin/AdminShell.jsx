import Link from "next/link";
import { useRouter } from "next/router";
import { useAdminLogout } from "../../lib/admin-portal/use-admin-session.js";
import {
  ADMIN_LOGOUT,
  ADMIN_LOGOUT_BUSY,
  ADMIN_NAV_PARENTS,
  ADMIN_NAV_ALL_ACCOUNTS,
  ADMIN_NAV_ANALYTICS,
  ADMIN_NAV_SCHOOLS,
  ADMIN_NAV_TEACHERS,
  ADMIN_NAV_REWARDS,
  ADMIN_PLATFORM_LABEL,
} from "../../lib/admin-portal/admin-ui.he.js";

/** Wide centered admin console column — not full bleed, not article-narrow. */
export const ADMIN_PAGE_CONTAINER =
  "max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-10";

const NAV_ITEMS = [
  { href: "/admin/accounts", label: ADMIN_NAV_ALL_ACCOUNTS },
  { href: "/admin/analytics", label: ADMIN_NAV_ANALYTICS },
  { href: "/admin/rewards", label: ADMIN_NAV_REWARDS },
  { href: "/admin/teachers", label: ADMIN_NAV_TEACHERS },
  { href: "/admin/schools", label: ADMIN_NAV_SCHOOLS },
  { href: "/admin/parents", label: ADMIN_NAV_PARENTS },
];

function navLinkClass(active) {
  return [
    "inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors",
    active
      ? "bg-amber-500/20 border-amber-400/40 text-amber-200"
      : "border-transparent text-white/70 hover:text-white hover:bg-white/5",
  ].join(" ");
}

export default function AdminShell({ title, header, children, showLogout = false }) {
  const { logout, busy } = useAdminLogout();
  const router = useRouter();
  const path = router.pathname || "";

  return (
    <div className={`${ADMIN_PAGE_CONTAINER} text-white`} dir="rtl" lang="he">
      <header className="mb-6 border-b border-white/15 pb-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        {header ? (
          <div className="min-w-0">
            <p className="text-xs text-white/50 mb-1">{ADMIN_PLATFORM_LABEL}</p>
            {header}
          </div>
        ) : (
          <div className="min-w-0">
            <p className="text-xs text-white/50 mb-1">{ADMIN_PLATFORM_LABEL}</p>
            <h1 className="text-xl md:text-2xl font-bold text-right">{title}</h1>
          </div>
        )}
        <nav
          className="flex flex-nowrap items-center gap-1 sm:gap-2 text-sm shrink-0 overflow-x-auto max-w-full xl:justify-end"
          aria-label="ניווט מנהל מערכת"
        >
          {NAV_ITEMS.map((item) => {
            const active = path === item.href || path.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} className={navLinkClass(active)}>
                {item.label}
              </Link>
            );
          })}
          {showLogout ? (
            <button
              type="button"
              onClick={() => void logout()}
              disabled={busy}
              className="rounded-lg border border-white/25 bg-white/10 hover:bg-white/15 px-3 py-1.5 font-semibold text-white disabled:opacity-60 min-h-[2rem] min-w-[4.5rem] whitespace-nowrap"
            >
              {busy ? ADMIN_LOGOUT_BUSY : ADMIN_LOGOUT}
            </button>
          ) : null}
        </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
