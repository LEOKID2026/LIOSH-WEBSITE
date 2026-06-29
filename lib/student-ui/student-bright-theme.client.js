/**
 * Bright student pilot theme — class tokens for /student/home and /learning only.
 * Import from pilot pages; do not use on staff portals or other masters.
 */

/** Outer shell for /learning hub only (Layout) — bg via STUDENT_BRIGHT_PAGE_BG_STYLE. */
export const LEARNING_PAGE_SHELL =
  "min-h-[100svh] md:min-h-screen text-slate-800 flex flex-col";

export const STUDENT_BRIGHT = Object.freeze({
  pageWrap: "min-h-full",
  learningPageWrap: "min-h-full",

  hero:
    "rounded-3xl border border-sky-200 bg-white p-5 md:p-8 shadow-lg shadow-slate-200/60",
  heroAvatarBtn:
    "group shrink-0 rounded-2xl border border-sky-200 bg-sky-50 text-5xl md:text-6xl w-16 h-16 md:w-20 md:h-20 flex items-center justify-center cursor-pointer transition hover:border-sky-400 hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70",
  heroTitle: "text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight",
  heroSub: "text-slate-600 mt-1 text-sm md:text-base",
  heroCoins: "text-amber-700 mt-1 text-sm font-semibold tabular-nums",
  heroTagline: "text-sky-700 mt-2 text-sm md:text-base leading-relaxed",

  ctaPrimary:
    "inline-flex justify-center items-center min-h-[3.25rem] rounded-xl bg-sky-600 text-white font-bold px-5 py-3 text-base md:text-lg hover:bg-sky-700 transition shadow-md",
  ctaGames:
    "inline-flex justify-center items-center min-h-[3.25rem] rounded-xl bg-violet-600 text-white font-bold px-5 py-3 text-base md:text-lg hover:bg-violet-700 transition shadow-md",
  ctaSurpriseOpen:
    "inline-flex justify-center items-center min-h-[3.25rem] rounded-xl bg-orange-500 text-white font-bold px-5 py-3 text-base md:text-lg hover:bg-orange-600 transition shadow-md",
  ctaCollection:
    "inline-flex justify-center items-center min-h-[3.25rem] rounded-xl bg-teal-600 text-white font-bold px-5 py-3 text-base md:text-lg hover:bg-teal-700 transition shadow-md",
  ctaShareFriends:
    "inline-flex justify-center items-center min-h-[3.25rem] rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 text-white font-bold px-5 py-3 text-base md:text-lg hover:from-cyan-600 hover:to-sky-700 transition shadow-md",
  ctaSecondary:
    "inline-flex justify-center items-center min-h-[3.25rem] rounded-xl border border-slate-300 bg-white px-5 py-3 text-base md:text-lg font-bold text-slate-800 hover:bg-sky-50 hover:border-sky-400 transition shadow-sm",
  ctaLogout:
    "inline-flex justify-center items-center min-h-[3.25rem] rounded-xl border border-rose-300 bg-rose-50 px-5 py-3 text-base md:text-lg font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50",

  tile:
    "rounded-2xl border border-slate-300 bg-white p-4 md:p-5 text-right shadow-md hover:shadow-lg transition min-h-[6.75rem] md:min-h-[7.75rem] flex flex-col gap-2.5 overflow-hidden",
  tileAccentStats: "block h-2 w-full rounded-full bg-sky-500 mb-1",
  tileAccentProgress: "block h-2 w-full rounded-full bg-emerald-500 mb-1",
  tileAccentMissions: "block h-2 w-full rounded-full bg-cyan-500 mb-1",
  tileAccentSubjects: "block h-2 w-full rounded-full bg-teal-500 mb-1",
  tileAccentClassroom: "block h-2 w-full rounded-full bg-violet-500 mb-1",
  tileAccentWorksheets: "block h-2 w-full rounded-full bg-amber-500 mb-1",
  tileAccentBadges: "block h-2 w-full rounded-full bg-rose-500 mb-1",
  tileAccentRecommendations: "block h-2 w-full rounded-full bg-orange-500 mb-1",
  tileAccentDefault: "block h-2 w-full rounded-full bg-slate-300 mb-1",
  tileIconWrapStats: "inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-sky-100 border border-sky-200 text-2xl md:text-[1.75rem] shrink-0",
  tileIconWrapProgress: "inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-emerald-100 border border-emerald-200 text-2xl md:text-[1.75rem] shrink-0",
  tileIconWrapMissions: "inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-cyan-100 border border-cyan-200 text-2xl md:text-[1.75rem] shrink-0",
  tileIconWrapSubjects: "inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-teal-100 border border-teal-200 text-2xl md:text-[1.75rem] shrink-0",
  tileIconWrapClassroom: "inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-violet-100 border border-violet-200 text-2xl md:text-[1.75rem] shrink-0",
  tileIconWrapWorksheets: "inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-amber-100 border border-amber-200 text-2xl md:text-[1.75rem] shrink-0",
  tileIconWrapBadges: "inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-rose-100 border border-rose-200 text-2xl md:text-[1.75rem] shrink-0",
  tileIconWrapRecommendations: "inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-orange-100 border border-orange-200 text-2xl md:text-[1.75rem] shrink-0",
  tileIconWrapDefault: "inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-2xl md:text-[1.75rem] shrink-0",
  tileBody: "min-w-0 flex-1 flex flex-col justify-start gap-0.5",
  tileTitle:
    "text-sm md:text-base font-bold text-slate-900 leading-snug line-clamp-2 min-h-[2.5rem] md:line-clamp-none md:min-h-0",
  tileSub: "text-[11px] md:text-xs text-slate-600 leading-snug tabular-nums",
  tileHoverStats: "hover:border-sky-400 hover:bg-sky-50/40",
  tileHoverProgress: "hover:border-emerald-400 hover:bg-emerald-50/40",
  tileHoverMissions: "hover:border-cyan-400 hover:bg-cyan-50/40",
  tileHoverSubjects: "hover:border-teal-400 hover:bg-teal-50/40",
  tileHoverClassroom: "hover:border-violet-400 hover:bg-violet-50/40",
  tileHoverWorksheets: "hover:border-amber-400 hover:bg-amber-50/40",
  tileHoverBadges: "hover:border-rose-400 hover:bg-rose-50/40",
  tileHoverRecommendations: "hover:border-orange-400 hover:bg-orange-50/40",
  tileHoverDefault: "hover:border-sky-400",

  panelIntro: "text-sm text-slate-700 text-right mb-4 leading-relaxed",
  statsSummaryCard:
    "rounded-2xl border border-sky-200 bg-gradient-to-l from-sky-50 to-white p-4 md:p-5 shadow-md mb-4",
  statsSummaryTitle: "text-xs font-bold text-sky-800 uppercase tracking-wide mb-2",
  statsSummaryGrid: "grid grid-cols-2 sm:grid-cols-4 gap-3",
  statsSummaryItem: "text-center rounded-xl bg-white border border-sky-200 px-2 py-2.5 shadow-sm",
  statsSummaryLabel: "text-[10px] md:text-xs text-slate-600 font-medium leading-tight",
  statsSummaryValue: "text-lg md:text-xl font-bold text-sky-800 tabular-nums mt-0.5",

  statCard:
    "rounded-xl border border-slate-300 bg-white px-2.5 py-2 md:px-3 md:py-2.5 shadow-sm min-h-[4.25rem] flex flex-col justify-center hover:border-sky-300 hover:shadow-md transition",
  statLabel: "text-[11px] md:text-xs text-slate-600 mb-0.5 leading-snug line-clamp-2",
  statValue: "text-lg md:text-xl font-bold text-slate-900 tabular-nums leading-tight",
  statSub: "text-[10px] text-slate-400 mt-0.5 leading-tight line-clamp-2",

  monthlySection:
    "rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm",
  monthlyTitle: "text-base md:text-lg font-bold text-slate-800 mb-3 text-right",
  monthlyText: "text-slate-700",
  monthlyEncouragement: "text-sm text-slate-600",
  monthlyHighlight: "font-bold text-sky-600 tabular-nums",
  progressTrack: "h-3 rounded-full bg-slate-200 overflow-hidden border border-slate-100",
  progressFill: "h-full rounded-full bg-gradient-to-l from-sky-400 to-teal-400 transition-all duration-500",

  subjectCard:
    "rounded-2xl border border-slate-300 bg-white p-4 flex flex-col text-right shadow-md hover:border-teal-400 hover:shadow-lg transition overflow-hidden",
  subjectAccentBar: "block h-1 w-full rounded-full mb-3 -mx-0",
  subjectTitle: "text-lg font-bold text-slate-900 mb-2",
  subjectBody: "text-sm text-slate-700 space-y-1.5 mb-3 flex-1",
  subjectStatRow: "flex justify-between gap-2 text-sm border-b border-slate-100 pb-1.5 last:border-0 last:pb-0",
  subjectStatLabel: "text-slate-600",
  subjectStatValue: "text-slate-900 font-semibold tabular-nums",
  subjectMeta: "text-xs text-slate-400",
  subjectProgressTrack: "h-1.5 rounded-full bg-slate-200 mb-3 overflow-hidden",
  subjectProgressFill: "h-full bg-teal-500 rounded-full",
  subjectLink:
    "mt-auto inline-flex justify-center rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 text-sm transition min-h-11 items-center",

  activitySection:
    "rounded-2xl border border-violet-200 bg-violet-50/60 p-4 md:p-5 mb-4 shadow-sm",
  activitySectionTitle: "text-base md:text-lg font-bold text-violet-900 mb-3 text-right",
  activityCard:
    "rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right shadow-sm hover:border-violet-300 hover:shadow-md transition",
  activityCardTitle: "font-bold text-slate-900",
  activityCardMeta: "text-sm text-slate-600 mt-1",
  activityCardCta:
    "inline-flex justify-center rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 px-5 text-sm shrink-0 min-h-11 items-center",
  activityScopeBadge:
    "text-[10px] tracking-wide rounded-lg px-2 py-0.5 bg-violet-100 text-violet-900 border border-violet-200 font-semibold",

  worksheetSection:
    "rounded-2xl border border-amber-200 bg-amber-50/60 p-4 md:p-5 shadow-sm",
  worksheetSectionTitle: "text-base md:text-lg font-bold text-amber-900 mb-3 text-right",
  worksheetCard:
    "rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right shadow-sm hover:border-amber-300 hover:shadow-md transition",
  worksheetCardTitle: "font-bold text-slate-900",
  worksheetCardMeta: "text-sm text-slate-600 mt-1",
  worksheetCardCta:
    "inline-flex justify-center rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 px-5 text-sm shrink-0 min-h-11 items-center",

  panelEmpty:
    "rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-slate-600 text-sm leading-relaxed",

  badgePill:
    "rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-900",
  badgeSubject: "text-amber-700/70 text-xs mr-1",

  recommendCard:
    "rounded-2xl border border-violet-200 bg-violet-50/80 p-4 md:p-5 text-right flex flex-col shadow-sm",
  recommendTitle: "font-bold text-violet-900 mb-2",
  recommendBody: "text-sm text-slate-600 flex-1 mb-4",
  recommendCta:
    "inline-flex justify-center rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-bold py-2.5 text-sm transition min-h-11 items-center",

  emptyText: "text-slate-600 text-right leading-relaxed",
  errorBox:
    "mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-right space-y-3",
  errorTitle: "text-amber-900 font-semibold",
  errorBody: "text-slate-700 text-sm leading-relaxed",
  errorBtn: "rounded-xl bg-amber-500 text-white font-bold px-4 py-2 text-sm hover:bg-amber-600 min-h-10",

  buildErrorBox: "mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-right",
  buildErrorTitle: "text-rose-800 font-semibold mb-2",
  buildErrorBody: "text-slate-600 text-sm mb-4",
  buildErrorBtn:
    "rounded-xl bg-rose-500 text-white font-bold px-4 py-2 text-sm hover:bg-rose-600 min-h-10",

  skeleton: "h-[6.75rem] md:h-[7.75rem] rounded-2xl bg-slate-200/60 animate-pulse",
  loadingSpinner: "h-12 w-12 rounded-full border-2 border-sky-200 border-t-sky-500 animate-spin mb-4",
  loadingText: "text-slate-700 text-lg font-medium",

  hubHeaderCard:
    "rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/80 via-white to-amber-50/35 px-4 py-4 md:px-6 md:py-5 mb-4 md:mb-5 shadow-sm text-center",
  hubBadge:
    "inline-flex items-center justify-center gap-2 w-fit px-4 py-2 md:px-5 rounded-full bg-white text-sm md:text-base text-sky-800 font-bold border border-sky-200 shadow-sm min-h-11",
  hubTitle: "text-xl md:text-2xl lg:text-3xl font-bold leading-tight text-slate-800",
  hubDesc: "text-sm md:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed",
  hubBackLink:
    "inline-flex items-center justify-center rounded-xl border border-sky-200 bg-white px-4 py-2 text-base md:text-lg font-bold text-sky-800 hover:bg-sky-50 hover:border-sky-300 transition min-h-11 shadow-sm shrink-0 leading-none",
  hubTopBar:
    "grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-h-11 mb-3 md:mb-4",
  hubTopBarBack: "flex justify-start items-center min-h-11",
  hubTopBarTheme: "flex justify-end items-center min-h-11 w-full",

  hubCardBase:
    "group rounded-2xl border p-3 md:p-4 flex flex-col text-right min-h-[7rem] md:min-h-[7.5rem] bg-white shadow-sm overflow-hidden transition-colors duration-200 hover:shadow-md",
  hubCardHeadRow: "flex items-center gap-2 justify-start mb-1.5 min-w-0",
  hubCardTitle: "font-bold text-sm md:text-base leading-snug text-slate-800 min-w-0 flex-1",
  hubCardBlurb: "text-[11px] md:text-xs text-slate-600 leading-snug line-clamp-3 flex-1",
  hubCardEmoji:
    "inline-flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl text-xl md:text-2xl border shrink-0",
  hubCardBar: "block h-1 w-full rounded-full mb-2.5 opacity-80",
});

/** Per-subject card tint on /learning hub — soft pastels. */
export const SUBJECT_HUB_CARD = Object.freeze({
  "math-master": {
    card: "border-sky-100 hover:border-sky-200 bg-gradient-to-br from-sky-50/50 to-white",
    bar: "bg-sky-400",
    emoji: "bg-sky-50/80 border-sky-100",
  },
  "geometry-master": {
    card: "border-teal-100 hover:border-teal-200 bg-gradient-to-br from-teal-50/50 to-white",
    bar: "bg-teal-400",
    emoji: "bg-teal-50/80 border-teal-100",
  },
  "english-master": {
    card: "border-violet-100 hover:border-violet-200 bg-gradient-to-br from-violet-50/40 to-white",
    bar: "bg-violet-400",
    emoji: "bg-violet-50/80 border-violet-100",
  },
  "science-master": {
    card: "border-lime-100 hover:border-lime-200 bg-gradient-to-br from-lime-50/50 to-white",
    bar: "bg-lime-500",
    emoji: "bg-lime-50/80 border-lime-100",
  },
  "hebrew-master": {
    card: "border-rose-100 hover:border-rose-200 bg-gradient-to-br from-rose-50/40 to-white",
    bar: "bg-rose-400",
    emoji: "bg-rose-50/80 border-rose-100",
  },
  "geography-master": {
    card: "border-teal-100 hover:border-teal-200 bg-gradient-to-br from-teal-50/50 to-white",
    bar: "bg-teal-500",
    emoji: "bg-teal-50/80 border-teal-100",
  },
  "moledet-master": {
    card: "border-amber-100 hover:border-amber-200 bg-gradient-to-br from-amber-50/50 to-white",
    bar: "bg-amber-400",
    emoji: "bg-amber-50/80 border-amber-100",
  },
  "history-master": {
    card: "border-orange-100 hover:border-orange-200 bg-gradient-to-br from-orange-50/50 to-white",
    bar: "bg-orange-400",
    emoji: "bg-orange-50/80 border-orange-100",
  },
});

/** Top accent bar per subject slug (learning hub). @deprecated use SUBJECT_HUB_CARD.bar */
export const SUBJECT_ACCENT_BAR = Object.freeze({
  "math-master": "bg-sky-500",
  "geometry-master": "bg-teal-500",
  "english-master": "bg-violet-500",
  "science-master": "bg-lime-500",
  "hebrew-master": "bg-rose-500",
  "moledet-master": "bg-amber-500",
  "geography-master": "bg-teal-500",
  "moledet-geography-master": "bg-amber-500",
  "history-master": "bg-orange-500",
});
