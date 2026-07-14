/** @typedef {'sky' | 'violet' | 'emerald' | 'amber'} PracticeInnerVariant */

/**
 * Strong inner card styling for practice SEO content blocks.
 * @param {boolean} isBright
 * @param {PracticeInnerVariant} [variant]
 */
export function getPracticeInnerPanelClass(isBright, variant = "sky") {
  if (isBright) {
    const map = {
      sky: "rounded-2xl border-2 border-sky-200/90 bg-gradient-to-br from-sky-100/90 via-white to-cyan-100/75 p-5 shadow-lg shadow-sky-200/50 ring-1 ring-sky-100 md:p-6",
      violet:
        "rounded-2xl border-2 border-violet-200/90 bg-gradient-to-br from-violet-100/85 via-white to-sky-100/70 p-5 shadow-lg shadow-violet-200/40 ring-1 ring-violet-100 md:p-6",
      emerald:
        "rounded-2xl border-2 border-emerald-200/90 bg-gradient-to-br from-emerald-100/80 via-white to-teal-100/70 p-5 shadow-lg shadow-emerald-200/40 ring-1 ring-emerald-100 md:p-6",
      amber:
        "rounded-2xl border-2 border-amber-200/90 bg-gradient-to-br from-amber-100/90 via-white to-orange-50/80 p-5 shadow-lg shadow-amber-200/45 ring-1 ring-amber-100 md:p-6",
    };
    return map[variant];
  }

  const map = {
    sky: "rounded-2xl border-2 border-cyan-400/35 bg-gradient-to-br from-cyan-500/25 via-sky-900/20 to-violet-900/15 p-5 shadow-xl shadow-black/25 md:p-6",
    violet:
      "rounded-2xl border-2 border-violet-400/35 bg-gradient-to-br from-violet-500/25 via-indigo-900/20 to-fuchsia-900/15 p-5 shadow-xl shadow-black/25 md:p-6",
    emerald:
      "rounded-2xl border-2 border-emerald-400/35 bg-gradient-to-br from-emerald-500/20 via-teal-900/15 to-cyan-900/15 p-5 shadow-xl shadow-black/25 md:p-6",
    amber:
      "rounded-2xl border-2 border-amber-400/35 bg-gradient-to-br from-amber-500/25 via-orange-900/15 to-yellow-900/10 p-5 shadow-xl shadow-black/25 md:p-6",
  };
  return map[variant];
}

/**
 * @param {boolean} isBright
 * @param {PracticeInnerVariant} [variant]
 */
export function getPracticeInnerBadgeClass(isBright, variant = "sky") {
  if (isBright) {
    const map = {
      sky: "inline-flex rounded-full border border-sky-300 bg-sky-200/80 px-3 py-1 text-sm font-black text-sky-900 md:text-base",
      violet:
        "inline-flex rounded-full border border-violet-300 bg-violet-200/80 px-3 py-1 text-sm font-black text-violet-900 md:text-base",
      emerald:
        "inline-flex rounded-full border border-emerald-300 bg-emerald-200/80 px-3 py-1 text-sm font-black text-emerald-900 md:text-base",
      amber:
        "inline-flex rounded-full border border-amber-300 bg-amber-200/85 px-3 py-1 text-sm font-black text-amber-900 md:text-base",
    };
    return map[variant];
  }

  const map = {
    sky: "inline-flex rounded-full border border-cyan-400/50 bg-cyan-500/25 px-3 py-1 text-sm font-black text-cyan-100 md:text-base",
    violet:
      "inline-flex rounded-full border border-violet-400/50 bg-violet-500/25 px-3 py-1 text-sm font-black text-violet-100 md:text-base",
    emerald:
      "inline-flex rounded-full border border-emerald-400/50 bg-emerald-500/25 px-3 py-1 text-sm font-black text-emerald-100 md:text-base",
    amber:
      "inline-flex rounded-full border border-amber-400/50 bg-amber-500/25 px-3 py-1 text-sm font-black text-amber-100 md:text-base",
  };
  return map[variant];
}

/** @param {boolean} isBright */
export function getPracticeBulletRowClass(isBright) {
  return isBright
    ? "flex gap-3 rounded-xl border border-sky-100/90 bg-white/85 px-4 py-3 shadow-sm"
    : "flex gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3";
}

/** @type {PracticeInnerVariant[]} */
export const PRACTICE_INNER_VARIANTS = ["sky", "violet", "emerald"];

/**
 * Pick a panel color from section title — parent / why / play / default.
 * @param {string} title
 * @returns {PracticeInnerVariant}
 */
export function getPracticeSectionPanelVariant(title) {
  const t = title || "";
  if (/הורה|הורים|דוח/.test(t)) return "amber";
  if (/^למה/.test(t)) return "emerald";
  if (/משחק|אתגר|כיף/.test(t)) return "violet";
  return "sky";
}
