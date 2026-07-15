/**
 * Unified wide public SEO layout — guides + practice + worksheets.
 */

export const PUBLIC_SEO_PAGE_MAX = "max-w-7xl";
export const PUBLIC_SEO_PAGE_PAD = "px-4 sm:px-6 lg:px-8";
export const PUBLIC_SEO_PAGE_SPACE = "space-y-8 py-8 md:space-y-10 md:py-12";

/** @typedef {'sky' | 'violet' | 'emerald' | 'amber'} PublicSeoPanelVariant */

/**
 * @param {boolean} isBright
 */
export function getPublicSeoWideClasses(isBright) {
  const heading = isBright ? "text-sky-900" : "text-sky-100";
  const body = isBright ? "text-right text-slate-600" : "text-right text-white/75";
  const muted = isBright ? "text-right text-slate-500" : "text-right text-white/60";

  return {
    heading,
    body,
    muted,
    badge: isBright
      ? "inline-flex rounded-full border border-cyan-300 bg-cyan-100 px-4 py-1.5 text-xs font-semibold text-cyan-900"
      : "inline-flex rounded-full border border-cyan-400/40 bg-cyan-500/15 px-4 py-1.5 text-xs font-semibold text-cyan-200",
    heroShell: isBright
      ? "rounded-3xl border border-sky-200/90 bg-gradient-to-br from-emerald-50 via-sky-50 to-violet-100/60 p-5 text-center shadow-xl shadow-sky-100/40 sm:p-7 lg:p-10"
      : "rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-600/20 via-indigo-900/40 to-violet-900/30 p-5 text-center shadow-2xl shadow-black/40 sm:p-7 lg:p-10",
    h1: `text-3xl font-black leading-tight md:text-4xl ${heading}`,
    intro: `mx-auto mt-4 max-w-3xl text-sm leading-relaxed md:text-base ${body}`,
    section: isBright
      ? "rounded-2xl border border-slate-200/80 bg-white/80 p-5 text-right shadow-md md:p-7"
      : "rounded-2xl border border-white/10 bg-white/5 p-5 text-right shadow-lg shadow-black/20 md:p-7",
    sectionTitle: isBright
      ? "text-right text-2xl font-black text-sky-900 md:text-3xl"
      : "text-right text-2xl font-black text-sky-100 md:text-3xl",
    sectionSubtitle: isBright
      ? "text-right text-lg font-bold text-sky-900 md:text-xl"
      : "text-right text-lg font-bold text-sky-100 md:text-xl",
    highlight: isBright
      ? "rounded-2xl border border-sky-200 bg-sky-50/80 p-5 text-right md:p-6"
      : "rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-5 text-right md:p-6",
    footerCta: isBright
      ? "rounded-3xl border border-sky-200/90 bg-gradient-to-br from-cyan-50 via-sky-50 to-violet-100/70 p-6 text-center shadow-lg shadow-sky-100/50 md:p-10"
      : "rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/15 via-sky-500/10 to-violet-500/15 p-6 text-center shadow-xl shadow-black/30 md:p-10",
    footerTitle: isBright
      ? "text-2xl font-black text-sky-900 md:text-3xl"
      : "text-2xl font-black text-sky-100 md:text-3xl",
    footerBody: `mx-auto mt-3 max-w-2xl text-sm leading-relaxed md:text-base ${body}`,
    hubCard: isBright
      ? "block rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/80 to-violet-50/40 p-4 text-right shadow-md transition hover:border-sky-200 hover:shadow-lg"
      : "block rounded-2xl border border-white/10 bg-white/5 p-4 text-right transition hover:bg-white/10",
    hubCardTitle: isBright ? "font-bold text-sky-900" : "font-bold text-white",
    hubCardBlurb: isBright ? "mt-1 text-right text-sm text-slate-600" : "mt-1 text-right text-sm text-white/70",
    linkSky: isBright
      ? "font-medium text-sky-700 underline underline-offset-2 hover:text-sky-900"
      : "font-medium text-sky-300 underline underline-offset-2 hover:text-sky-100",
    linkViolet: isBright
      ? "font-medium text-violet-700 underline underline-offset-2 hover:text-violet-900"
      : "font-medium text-violet-300 underline underline-offset-2 hover:text-violet-100",
    bulletRow: isBright
      ? "flex items-start gap-3 rounded-xl border border-sky-100/90 bg-white/85 px-4 py-3 text-right shadow-sm"
      : "flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-right",
    bulletIcon: isBright
      ? "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700 ring-2 ring-emerald-200"
      : "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/25 text-xs font-black text-emerald-200 ring-2 ring-emerald-400/30",
    interactiveSlot: isBright
      ? "rounded-2xl border border-sky-200/80 bg-white/90 p-4 text-right shadow-md md:p-6"
      : "rounded-2xl border border-white/10 bg-white/5 p-4 text-right md:p-6",
  };
}

/**
 * @param {boolean} isBright
 * @param {PublicSeoPanelVariant} [variant]
 */
export function getPublicSeoInnerPanelClass(isBright, variant = "sky") {
  if (isBright) {
    const map = {
      sky: "rounded-2xl border-2 border-sky-200/90 bg-gradient-to-br from-sky-100/90 via-white to-cyan-100/75 p-5 text-right shadow-lg shadow-sky-200/50 ring-1 ring-sky-100 md:p-6",
      violet:
        "rounded-2xl border-2 border-violet-200/90 bg-gradient-to-br from-violet-100/85 via-white to-sky-100/70 p-5 text-right shadow-lg shadow-violet-200/40 ring-1 ring-violet-100 md:p-6",
      emerald:
        "rounded-2xl border-2 border-emerald-200/90 bg-gradient-to-br from-emerald-100/80 via-white to-teal-100/70 p-5 text-right shadow-lg shadow-emerald-200/40 ring-1 ring-emerald-100 md:p-6",
      amber:
        "rounded-2xl border-2 border-amber-200/90 bg-gradient-to-br from-amber-100/90 via-white to-orange-50/80 p-5 text-right shadow-lg shadow-amber-200/45 ring-1 ring-amber-100 md:p-6",
    };
    return map[variant];
  }

  const map = {
    sky: "rounded-2xl border-2 border-cyan-400/35 bg-gradient-to-br from-cyan-500/25 via-sky-900/20 to-violet-900/15 p-5 text-right shadow-xl shadow-black/25 md:p-6",
    violet:
      "rounded-2xl border-2 border-violet-400/35 bg-gradient-to-br from-violet-500/25 via-indigo-900/20 to-fuchsia-900/15 p-5 text-right shadow-xl shadow-black/25 md:p-6",
    emerald:
      "rounded-2xl border-2 border-emerald-400/35 bg-gradient-to-br from-emerald-500/20 via-teal-900/15 to-cyan-900/15 p-5 text-right shadow-xl shadow-black/25 md:p-6",
    amber:
      "rounded-2xl border-2 border-amber-400/35 bg-gradient-to-br from-amber-500/25 via-orange-900/15 to-yellow-900/10 p-5 text-right shadow-xl shadow-black/25 md:p-6",
  };
  return map[variant];
}

/** @param {boolean} isBright @param {PublicSeoPanelVariant} [variant] */
export function getPublicSeoInnerBadgeClass(isBright, variant = "sky") {
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

/** @type {PublicSeoPanelVariant[]} */
export const PUBLIC_SEO_INNER_VARIANTS = ["sky", "violet", "emerald"];

/** @param {string} title @returns {PublicSeoPanelVariant} */
export function getPublicSeoSectionPanelVariant(title) {
  const t = title || "";
  if (/הורה|הורים|דוח/.test(t)) return "amber";
  if (/^למה/.test(t)) return "emerald";
  if (/משחק|אתגר|כיף/.test(t)) return "violet";
  return "sky";
}
