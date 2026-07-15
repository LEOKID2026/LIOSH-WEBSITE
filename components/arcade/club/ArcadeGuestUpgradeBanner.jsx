import Link from "next/link";

/** @param {{ className?: string }} props */
export default function ArcadeGuestUpgradeBanner({ className = "" }) {
  return (
    <div
      className={`rounded-xl border border-amber-400/30 bg-gradient-to-l from-amber-500/15 to-transparent p-3 text-right ${className}`}
      dir="rtl"
    >
      <p className="text-sm font-semibold text-amber-100">שדרג לפרופיל ליאו לחוויה מלאה</p>
      <p className="mt-1 text-xs text-amber-100/75">
        קשר עם הורה שומר מטבעות, קלפים ושם תצוגה - בלי לחסום את המשחקים.
      </p>
      <Link
        href="/student/home"
        className="mt-2 inline-block rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-black"
      >
        למסך הבית
      </Link>
    </div>
  );
}
