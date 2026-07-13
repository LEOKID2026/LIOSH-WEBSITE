import { ACCENT } from "../marketing/MarketingLandingPage";

export { ACCENT };

export const HOME_PAGE_MAX = "max-w-7xl";
export const HOME_PAGE_PAD = "px-4 sm:px-6 lg:px-8";

export function getHomeTextClasses(isBright) {
  return {
    title: isBright ? "text-slate-900" : "text-white",
    heading: isBright ? "text-sky-900" : "text-sky-100",
    body: isBright ? "text-slate-600" : "text-white/75",
    muted: isBright ? "text-slate-500" : "text-white/60",
    sectionTitle: isBright
      ? "text-2xl font-black text-sky-900 md:text-3xl"
      : "text-2xl font-black text-sky-100 md:text-3xl",
    label: isBright
      ? "border border-cyan-300 bg-cyan-100 text-cyan-900"
      : "bg-white/10 text-cyan-300",
    kidsLabel: isBright
      ? "border border-violet-300 bg-violet-100 text-violet-900"
      : "bg-white/10 text-fuchsia-300",
    teacherLabel: isBright
      ? "border border-amber-300 bg-amber-100 text-amber-900"
      : "bg-white/10 text-amber-300",
    heroBadge: isBright
      ? "border border-green-400 bg-green-300 text-blue-800 shadow-sm"
      : "bg-white/10 text-amber-300",
    reinforcement: isBright
      ? "border border-sky-300 bg-sky-50 text-sky-800"
      : "border border-cyan-400/40 bg-cyan-500/10 text-cyan-100",
    panel: isBright
      ? "rounded-2xl border border-slate-200/80 bg-white/80 p-5 md:p-7 shadow-md"
      : "rounded-2xl border border-white/10 bg-white/5 p-5 md:p-7 shadow-lg shadow-black/20",
    systemPanel: isBright
      ? "rounded-3xl border border-sky-200/90 bg-gradient-to-br from-cyan-50 via-sky-50 to-violet-100/70 p-6 md:p-10 shadow-lg shadow-sky-100/50"
      : "rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-cyan-500/15 via-sky-500/10 to-violet-500/15 p-6 md:p-10 shadow-xl shadow-black/30",
    heroShell: isBright
      ? "rounded-3xl border border-sky-200/90 bg-gradient-to-br from-emerald-50 via-sky-50 to-violet-100/60 p-5 shadow-xl shadow-sky-100/40 sm:p-7 lg:p-10"
      : "rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-600/20 via-indigo-900/40 to-violet-900/30 p-5 shadow-2xl shadow-black/40 sm:p-7 lg:p-10",
    heroFlowCard: isBright
      ? "rounded-2xl border border-violet-200/80 bg-gradient-to-br from-white via-sky-50/90 to-violet-50/80 p-4 shadow-lg sm:p-6 lg:p-8"
      : "rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-black/50 via-cyan-900/30 to-violet-900/40 p-4 shadow-xl sm:p-6 lg:p-8",
    featuredVideoShell: isBright
      ? "rounded-3xl border border-sky-200/90 bg-gradient-to-br from-white via-cyan-50/50 to-violet-50/40 p-4 shadow-xl sm:p-6 lg:p-8"
      : "rounded-3xl border border-white/15 bg-gradient-to-br from-white/5 via-cyan-500/10 to-violet-500/10 p-4 shadow-2xl sm:p-6 lg:p-8",
    highlight: isBright
      ? "rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 text-sky-900"
      : "rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-cyan-100",
    actionsBand: isBright
      ? "rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-md sm:p-6"
      : "rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg sm:p-6",
  };
}

export function getHomeBtnClasses(accentKey, isBright, variant = "primary") {
  const accent = ACCENT[accentKey];
  if (variant === "secondary") {
    return isBright ? accent.secondaryBtnBright : accent.secondaryBtnClassic;
  }
  return isBright ? accent.primaryBtnBright : accent.primaryBtnClassic;
}
