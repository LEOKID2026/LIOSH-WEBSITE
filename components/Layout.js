import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import SiteLegalFooterBar from "./layout/SiteLegalFooterBar.jsx";
import StudentAdSlot from "./student/StudentAdSlot.jsx";
import StudentThemePicker from "./student/StudentThemePicker.jsx";
import {
  getAreaHomeHref,
  getContextNav,
  isImmersiveGameLayoutPath,
  isPurePublicMarketingPath,
  NAV_AREAS,
  resolveNavArea,
  shouldLayoutUseRtl,
  shouldShowLayoutStudentAdSlot,
  shouldShowLayoutThemePicker,
} from "../lib/site-nav";
import {
  clearSiteNavPortal,
  persistSiteNavPortal,
  readSiteNavPortal,
} from "../lib/site-nav-portal-context.client.js";
import { STUDENT_BRIGHT_PAGE_BG_STYLE, STUDENT_BRIGHT_SITE_CHROME_BG } from "../lib/student-ui/student-bright-page-background.client.js";
import { STUDENT_LAYOUT_CHROME_BOTTOM_CSS } from "../lib/student-ui/student-ad-slot.client.js";

export default function Layout({
  children,
  homepage = false,
  /** @deprecated use studentTheme + studentShell */
  studentBrightShell = false,
  /** @deprecated use studentTheme + studentShell */
  studentLearningShell = false,
  studentTheme = null,
  studentShell = null,
  /** When true, show bright/classic picker even if pathname is not in the default allowlist. */
  layoutShowThemePicker = false,
  /** Lock shell to one viewport (no document scroll) — parent-report empty/loading under /parent. */
  layoutLockViewport = false,
  /** Optional override for HUD nav area (student | parent | teacher). */
  layoutNavArea = null,
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePortal, setActivePortal] = useState(() =>
    typeof window !== "undefined" ? readSiteNavPortal() : null
  );

  const pathname = router.pathname || "";
  const authPortal =
    pathname.startsWith("/auth/") && typeof router.query?.portal === "string"
      ? router.query.portal
      : undefined;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (layoutNavArea) {
      persistSiteNavPortal(layoutNavArea);
      setActivePortal(layoutNavArea);
      return;
    }

    const pathArea = resolveNavArea(pathname, { authPortal });
    if (pathArea !== NAV_AREAS.public) {
      persistSiteNavPortal(pathArea);
      setActivePortal(pathArea);
      return;
    }

    if (isPurePublicMarketingPath(pathname)) {
      clearSiteNavPortal();
      setActivePortal(null);
      return;
    }

    setActivePortal(readSiteNavPortal());
  }, [pathname, authPortal, layoutNavArea]);

  const isGamePage = isImmersiveGameLayoutPath(pathname);

  if (isGamePage) {
    // For game pages, return only the children without header/footer
    return <>{children}</>;
  }

  const closeMenu = () => setMenuOpen(false);

  const navOptions = {
    authPortal,
    activePortal: layoutNavArea || activePortal || undefined,
  };
  const { links: menuLinks } = getContextNav(pathname, navOptions);
  const areaHomeHref = getAreaHomeHref(pathname, navOptions);
  const layoutRtlHebrew = shouldLayoutUseRtl(pathname);
  const showThemePicker = layoutShowThemePicker || shouldShowLayoutThemePicker(pathname);

  const resolvedTheme =
    studentTheme ||
    (studentLearningShell || studentBrightShell ? "bright" : null);
  const resolvedShell =
    studentShell || (studentLearningShell ? "learning" : studentBrightShell ? "home" : null);

  const isStudentBright = resolvedTheme === "bright";
  const isLearningBright = isStudentBright && resolvedShell === "learning";

  const brightHomeShell =
    "min-h-[100svh] md:min-h-screen text-slate-900 flex flex-col";
  const brightLearningShell =
    "min-h-[100svh] md:min-h-screen text-slate-800 flex flex-col";
  const classicShell =
    "min-h-[100svh] md:min-h-screen bg-gradient-to-b from-[#050816] via-[#0b1020] to-[#050816] text-white flex flex-col";

  const showStudentAd = shouldShowLayoutStudentAdSlot(pathname);
  const shellClassBase = isLearningBright
    ? brightLearningShell
    : isStudentBright
    ? brightHomeShell
    : classicShell;
  const shellClass = layoutLockViewport
    ? `${shellClassBase} h-[100svh] max-h-[100svh] overflow-hidden`
    : shellClassBase;
  const headerClass = isStudentBright
    ? `w-full border-b border-sky-100 ${STUDENT_BRIGHT_SITE_CHROME_BG} backdrop-blur sticky top-0 z-30 shrink-0 shadow-sm`
    : "w-full border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-30 shrink-0";
  const navLinkClass = isStudentBright
    ? "px-2 py-1.5 rounded-full hover:bg-sky-50 text-slate-700 transition whitespace-nowrap"
    : "px-2 py-1.5 rounded-full hover:bg-white/10 transition whitespace-nowrap";
  const menuBtnClass = isStudentBright
    ? "md:hidden px-3 py-2 rounded-lg border border-slate-200 hover:bg-sky-50 text-slate-700 transition"
    : "md:hidden px-3 py-2 rounded-lg border border-white/20 hover:bg-white/10 transition";
  const mobileMenuOverlay = isStudentBright ? "bg-slate-900/40" : "bg-black/70";
  const mobileMenuPanel = isStudentBright
    ? "absolute top-4 right-4 bg-white border border-slate-200 rounded-2xl p-4 w-64 shadow-xl"
    : "absolute top-4 right-4 bg-black/60 border border-white/10 rounded-2xl p-4 w-64";
  const mobileMenuLabel = isStudentBright ? "text-slate-500" : "text-white/60";
  const mobileMenuClose = isStudentBright ? "text-slate-500 hover:text-slate-800" : "text-white/70 hover:text-white";
  const mobileMenuItem = isStudentBright
    ? "px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-sky-50 text-slate-800 transition"
    : "px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition";
  const footerClass = isStudentBright
    ? `border-t border-sky-100 ${STUDENT_BRIGHT_SITE_CHROME_BG} shrink-0 ${homepage || showStudentAd ? "" : "mt-10"}`
    : `border-t border-white/10 bg-black/40 shrink-0 ${homepage || showStudentAd ? "" : "mt-10"}`;

  const renderLegalFooter = () => (
    <footer className={footerClass}>
      <SiteLegalFooterBar isStudentBright={isStudentBright} />
    </footer>
  );

  return (
    <div
      className={shellClass}
      style={isStudentBright ? STUDENT_BRIGHT_PAGE_BG_STYLE : undefined}
      dir={layoutRtlHebrew ? "rtl" : undefined}
      lang={layoutRtlHebrew ? "he" : undefined}
    >
      <header className={headerClass}>
        <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 md:gap-3">
          <Link
            href={areaHomeHref}
            className={`flex items-center gap-2 font-extrabold tracking-widest text-lg shrink-0 ${
              isStudentBright ? "text-red-600" : ""
            }`}
          >
            <img
              src="/images/coin.png"
              alt="לוגו LEO KIDS"
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
              style={{ transform: "scale(1.9)" }}
            />
            <span>LEO KIDS</span>
          </Link>

          <div className="hidden md:flex flex-1 flex-wrap items-center gap-1 text-sm font-semibold min-w-0">
            {menuLinks.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                className={navLinkClass}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="ms-auto flex items-center gap-1.5 shrink-0">
            {showThemePicker ? (
              <StudentThemePicker variant="icon" iconSize="nav" />
            ) : null}
            <button
              className={`${menuBtnClass} md:hidden`}
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="פתיחת תפריט"
            >
              ☰
            </button>
          </div>
        </nav>
      </header>

      {menuOpen && (
        <div className={`md:hidden fixed inset-0 ${mobileMenuOverlay} backdrop-blur-sm z-40`}>
          <div className={mobileMenuPanel}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm uppercase tracking-[0.3em] ${mobileMenuLabel}`}>
                תפריט
              </span>
              <button
                onClick={closeMenu}
                className={`${mobileMenuClose} text-lg`}
                aria-label="סגור תפריט"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-2 text-base font-semibold">
              {menuLinks.map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  className={mobileMenuItem}
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            {showThemePicker ? (
              <div
                className={`mt-3 pt-3 flex justify-center ${
                  isStudentBright ? "border-t border-slate-200" : "border-t border-white/10"
                }`}
              >
                <StudentThemePicker variant="icon" iconSize="nav" />
              </div>
            ) : null}
          </div>
        </div>
      )}

      <main
        className={`flex-1 min-h-0 flex flex-col${
          layoutLockViewport ? " overflow-hidden" : ""
        }`}
        style={showStudentAd ? { paddingBottom: STUDENT_LAYOUT_CHROME_BOTTOM_CSS } : undefined}
      >
        {children}
      </main>
      {showStudentAd ? (
        <div
          className="fixed inset-x-0 bottom-0 z-30 flex flex-col"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <StudentAdSlot
            variant="layout"
            theme={isStudentBright ? "bright" : "classic"}
          />
          {renderLegalFooter()}
        </div>
      ) : (
        renderLegalFooter()
      )}
    </div>
  );
}
