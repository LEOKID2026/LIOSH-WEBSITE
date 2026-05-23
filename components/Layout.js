import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import DevCoinTopupNav from "./layout/DevCoinTopupNav";
import { LEGAL_FOOTER_LINKS } from "../data/legal/sitePolicies.he";

const menuLinksBase = [
  { href: "/", label: "בית" },
  { href: "/parent/login", label: "עמוד הורים" },
  { href: "/student/home", label: "עמוד תלמיד" },
  { href: "/game", label: "משחקים" },
  { href: "/offline", label: "לא מקוון" },
  { href: "/learning", label: "לימודים" },
  { href: "/about", label: "אודות" },
  { href: "/gallery", label: "גלריה" },
  { href: "/contact", label: "צור קשר" },
  { href: "/help", label: "מרכז עזרה" },
];

const engineReviewNav =
  process.env.NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN === "true"
    ? [{ href: "/learning/dev/engine-review", label: "סקירת מנוע" }]
    : [];

const menuLinks = [...menuLinksBase, ...engineReviewNav];

export default function Layout({ children }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // Game / immersive learning UIs: no site header. Dev admin under /learning/dev/* keeps the sticky nav (incl. mobile menu).
  const isLearningDev = router.pathname.startsWith("/learning/dev");
  const isGamePage =
    !isLearningDev &&
    (router.pathname.includes("/learning/") ||
      router.pathname.includes("/offline/") ||
      router.pathname.includes("/mleo-"));

  if (isGamePage) {
    // For game pages, return only the children without header/footer
    return <>{children}</>;
  }

  const closeMenu = () => setMenuOpen(false);

  const pathname = router.pathname || "";
  /** RTL for Hebrew-primary flows — keeps header/logo order stable (same as parent/student hubs). */
  const layoutRtlHebrew =
    pathname === "/" ||
    pathname.startsWith("/parent") ||
    pathname === "/student/login" ||
    pathname.startsWith("/student/home") ||
    pathname.startsWith("/student/arcade") ||
    pathname === "/learning" ||
    pathname.startsWith("/learning/dev") ||
    pathname === "/game" ||
    pathname.startsWith("/offline") ||
    pathname.startsWith("/gallery") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/help") ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/accessibility" ||
    pathname === "/data-deletion" ||
    pathname === "/ai-disclosure" ||
    pathname === "/security";

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-[#050816] via-[#0b1020] to-[#050816] text-white"
      dir={layoutRtlHebrew ? "rtl" : undefined}
    >
      <header className="w-full border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-30">
        <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-extrabold tracking-widest text-lg"
          >
            <img
              src="/images/coin.png"
              alt="לוגו LEO KIDS"
              className="w-8 h-8 object-contain"
              style={{ transform: "scale(1.9)" }}
            />
            <span>LEO KIDS</span>
          </Link>

          <div className="hidden md:flex flex-wrap items-center justify-end gap-2 text-sm font-semibold">
            {menuLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-full hover:bg-white/10 transition"
              >
                {link.label}
              </Link>
            ))}
            <DevCoinTopupNav variant="desktop" />
          </div>

          <button
            className="md:hidden px-3 py-2 rounded-lg border border-white/20 hover:bg-white/10 transition"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="פתיחת תפריט"
          >
            ☰
          </button>
        </nav>

      </header>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40">
          <div className="absolute top-4 right-4 bg-black/60 border border-white/10 rounded-2xl p-4 w-64">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm uppercase tracking-[0.3em] text-white/60">
                תפריט
              </span>
              <button
                onClick={closeMenu}
                className="text-white/70 hover:text-white text-lg"
                aria-label="סגור תפריט"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-2 text-base font-semibold">
              {menuLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <DevCoinTopupNav variant="mobile" />
          </div>
        </div>
      )}

      <main className="min-h-[calc(100vh-56px)]">{children}</main>
      <footer className="border-t border-white/10 bg-black/40 mt-10">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-white/60 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-between items-start sm:items-center">
          <span>
            © {new Date().getFullYear()} LEO K · משחקים ולמידה לילדים
          </span>
          <nav aria-label="קישורים משפטיים" className="flex flex-wrap gap-x-4 gap-y-1">
            {LEGAL_FOOTER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-white transition">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
