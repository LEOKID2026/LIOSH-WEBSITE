/**
 * Classic (dark) student UI tokens — mirrors STUDENT_BRIGHT keys for theme toggle.
 */

export const CLASSIC_LEARNING_PAGE_SHELL =
  "min-h-[100svh] md:min-h-screen bg-gradient-to-b from-[#050816] via-[#0b1020] to-[#050816] text-white flex flex-col";

export const STUDENT_CLASSIC = Object.freeze({
  pageWrap: "min-h-full",
  learningPageWrap: "",

  hero:
    "rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-5 md:p-8 shadow-lg shadow-black/20",
  heroAvatarBtn:
    "group shrink-0 rounded-2xl border border-white/15 bg-white/5 text-5xl md:text-6xl w-16 h-16 md:w-20 md:h-20 flex items-center justify-center cursor-pointer transition hover:border-emerald-400/40 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50",
  heroTitle: "text-2xl md:text-3xl font-extrabold text-white tracking-tight",
  heroSub: "text-white/70 mt-1 text-sm md:text-base",
  heroCoins: "text-amber-200/95 mt-1 text-sm font-semibold tabular-nums",
  heroTagline: "text-white/60 mt-2 text-sm md:text-base leading-relaxed",

  ctaPrimary:
    "inline-flex justify-center items-center min-h-[3.25rem] rounded-xl bg-emerald-500/90 text-white font-bold px-5 py-3 text-base md:text-lg hover:bg-emerald-500 transition shadow-md",
  ctaGames:
    "inline-flex justify-center items-center min-h-[3.25rem] rounded-xl border border-violet-400/35 bg-violet-500/20 text-white font-bold px-5 py-3 text-base md:text-lg hover:bg-violet-500/30 transition",
  ctaSurpriseOpen:
    "inline-flex justify-center items-center min-h-[3.25rem] rounded-xl border border-amber-400/45 bg-amber-500/30 text-amber-50 font-bold px-5 py-3 text-base md:text-lg hover:bg-amber-500/40 transition",
  ctaCollection:
    "inline-flex justify-center items-center min-h-[3.25rem] rounded-xl border border-teal-400/40 bg-teal-500/25 text-teal-50 font-bold px-5 py-3 text-base md:text-lg hover:bg-teal-500/35 transition",
  ctaShareFriends:
    "inline-flex justify-center items-center min-h-[3.25rem] rounded-xl border border-cyan-400/45 bg-gradient-to-r from-cyan-500/30 to-sky-500/25 text-cyan-50 font-bold px-5 py-3 text-base md:text-lg hover:from-cyan-500/40 hover:to-sky-500/35 transition",
  ctaSecondary:
    "inline-flex justify-center items-center min-h-[3.25rem] rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-base md:text-lg font-bold text-white hover:bg-white/10 transition",
  ctaLogout:
    "inline-flex justify-center items-center min-h-[3.25rem] rounded-xl border border-rose-400/30 bg-rose-950/30 px-5 py-3 text-base md:text-lg font-semibold text-rose-100 hover:bg-rose-950/50 transition disabled:opacity-50",

  tile:
    "rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4 md:p-5 text-right shadow-lg shadow-black/20 min-h-[6.75rem] md:min-h-[7.75rem] flex flex-col gap-2.5 overflow-hidden transition hover:border-emerald-400/35 hover:from-emerald-950/30 hover:to-white/[0.04]",
  tileAccentStats: "block h-2 w-full rounded-full bg-sky-500 mb-1",
  tileAccentProgress: "block h-2 w-full rounded-full bg-emerald-500 mb-1",
  tileAccentMissions: "block h-2 w-full rounded-full bg-cyan-500 mb-1",
  tileAccentSubjects: "block h-2 w-full rounded-full bg-teal-500 mb-1",
  tileAccentClassroom: "block h-2 w-full rounded-full bg-violet-500 mb-1",
  tileAccentWorksheets: "block h-2 w-full rounded-full bg-amber-500 mb-1",
  tileAccentBadges: "block h-2 w-full rounded-full bg-rose-500 mb-1",
  tileAccentRecommendations: "block h-2 w-full rounded-full bg-orange-500 mb-1",
  tileAccentDefault: "block h-2 w-full rounded-full bg-slate-400/70 mb-1",
  tileIconWrapStats:
    "inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-white/5 border border-sky-400/30 text-2xl md:text-[1.75rem] shrink-0",
  tileIconWrapProgress:
    "inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-white/5 border border-emerald-400/30 text-2xl md:text-[1.75rem] shrink-0",
  tileIconWrapMissions:
    "inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-white/5 border border-cyan-400/30 text-2xl md:text-[1.75rem] shrink-0",
  tileIconWrapSubjects:
    "inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-white/5 border border-teal-400/30 text-2xl md:text-[1.75rem] shrink-0",
  tileIconWrapClassroom:
    "inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-white/5 border border-violet-400/30 text-2xl md:text-[1.75rem] shrink-0",
  tileIconWrapWorksheets:
    "inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-white/5 border border-amber-400/30 text-2xl md:text-[1.75rem] shrink-0",
  tileIconWrapBadges:
    "inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-white/5 border border-rose-400/30 text-2xl md:text-[1.75rem] shrink-0",
  tileIconWrapRecommendations:
    "inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-white/5 border border-orange-400/30 text-2xl md:text-[1.75rem] shrink-0",
  tileIconWrapDefault:
    "inline-flex h-11 w-11 md:h-12 md:w-12 items-center justify-center rounded-xl bg-white/5 border border-white/20 text-2xl md:text-[1.75rem] shrink-0",
  tileBody: "min-w-0 flex-1 flex flex-col justify-start gap-0.5",
  tileTitle:
    "text-sm md:text-base font-bold text-white leading-snug line-clamp-2 min-h-[2.5rem] md:line-clamp-none md:min-h-0",
  tileSub: "text-[11px] md:text-xs text-white/55 leading-snug tabular-nums",
  tileHoverStats: "",
  tileHoverProgress: "",
  tileHoverMissions: "",
  tileHoverSubjects: "",
  tileHoverClassroom: "",
  tileHoverWorksheets: "",
  tileHoverBadges: "",
  tileHoverRecommendations: "",
  tileHoverDefault: "",

  panelIntro: "text-sm text-white/70 text-right mb-4 leading-relaxed",
  statsSummaryCard:
    "rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-inner shadow-black/20 mb-4",
  statsSummaryTitle: "text-xs font-bold text-white/60 uppercase tracking-wide mb-2",
  statsSummaryGrid: "grid grid-cols-2 sm:grid-cols-4 gap-3",
  statsSummaryItem: "text-center rounded-xl bg-black/25 border border-white/10 px-2 py-2.5",
  statsSummaryLabel: "text-[10px] md:text-xs text-white/55 font-medium leading-tight",
  statsSummaryValue: "text-lg md:text-xl font-bold text-white tabular-nums mt-0.5",

  statCard:
    "rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 md:px-3 md:py-2.5 shadow-inner shadow-black/20 min-h-[4.25rem] flex flex-col justify-center",
  statLabel: "text-[11px] md:text-xs text-white/65 mb-0.5 leading-snug line-clamp-2",
  statValue: "text-lg md:text-xl font-bold text-white tabular-nums leading-tight",
  statSub: "text-[10px] text-white/45 mt-0.5 leading-tight line-clamp-2",

  monthlySection: "rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-inner shadow-black/20",
  monthlyTitle: "text-base md:text-lg font-bold text-white mb-3 text-right",
  monthlyText: "text-white/75",
  monthlyEncouragement: "text-sm text-white/70",
  monthlyHighlight: "font-bold text-emerald-300 tabular-nums",
  progressTrack: "h-3 rounded-full bg-black/40 overflow-hidden border border-white/10",
  progressFill: "h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-400 transition-all duration-500",

  subjectCard:
    "rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 flex flex-col text-right shadow-lg shadow-black/20 hover:border-emerald-400/30 transition overflow-hidden",
  subjectAccentBar: "block h-1 w-full rounded-full mb-3 bg-emerald-500/60",
  subjectTitle: "text-lg font-bold text-white mb-2",
  subjectBody: "text-sm text-white/75 space-y-1.5 mb-3 flex-1",
  subjectStatRow: "flex justify-between gap-2 text-sm border-b border-white/10 pb-1.5 last:border-0 last:pb-0",
  subjectStatLabel: "text-white/55",
  subjectStatValue: "text-white font-semibold tabular-nums",
  subjectMeta: "text-xs text-white/45",
  subjectProgressTrack: "h-1.5 rounded-full bg-black/40 mb-3 overflow-hidden",
  subjectProgressFill: "h-full bg-emerald-500 rounded-full",
  subjectLink:
    "mt-auto inline-flex justify-center rounded-xl bg-emerald-500/85 hover:bg-emerald-500 text-white font-bold py-2.5 text-sm transition min-h-11 items-center",

  activitySection: "rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5 mb-4 shadow-inner shadow-black/20",
  activitySectionTitle: "text-base md:text-lg font-bold text-white mb-3 text-right",
  activityCard:
    "rounded-xl border border-white/10 bg-black/25 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right shadow-sm hover:border-emerald-400/30 transition",
  activityCardTitle: "font-bold text-white",
  activityCardMeta: "text-sm text-white/60 mt-1",
  activityCardCta:
    "inline-flex justify-center rounded-xl bg-emerald-500/85 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 text-sm shrink-0 min-h-11 items-center",
  activityScopeBadge:
    "text-[10px] tracking-wide rounded-lg px-2 py-0.5 bg-white/10 text-white/80 border border-white/15 font-semibold",

  worksheetSection: "rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-inner shadow-black/20",
  worksheetSectionTitle: "text-base md:text-lg font-bold text-white mb-3 text-right",
  worksheetCard:
    "rounded-xl border border-white/10 bg-black/25 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-right shadow-sm hover:border-amber-400/25 transition",
  worksheetCardTitle: "font-bold text-white",
  worksheetCardMeta: "text-sm text-white/60 mt-1",
  worksheetCardCta:
    "inline-flex justify-center rounded-xl bg-amber-500/85 hover:bg-amber-500 text-white font-bold py-2.5 px-5 text-sm shrink-0 min-h-11 items-center",

  panelEmpty:
    "rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-8 text-center text-white/55 text-sm leading-relaxed",

  badgePill: "rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-100",
  badgeSubject: "text-amber-200/60 text-xs mr-1",

  recommendCard:
    "rounded-2xl border border-violet-400/25 bg-violet-950/20 p-4 md:p-5 text-right flex flex-col shadow-sm",
  recommendTitle: "font-bold text-violet-100 mb-2",
  recommendBody: "text-sm text-white/65 flex-1 mb-4",
  recommendCta:
    "inline-flex justify-center rounded-xl bg-violet-500/85 hover:bg-violet-500 text-white font-bold py-2.5 text-sm transition min-h-11 items-center",

  emptyText: "text-white/65 text-right leading-relaxed",
  errorBox: "mt-4 rounded-2xl border border-amber-400/30 bg-amber-950/20 p-5 text-right space-y-3",
  errorTitle: "text-amber-100 font-semibold",
  errorBody: "text-white/75 text-sm leading-relaxed",
  errorBtn: "rounded-xl bg-amber-500/90 text-white font-bold px-4 py-2 text-sm hover:bg-amber-400 min-h-10",

  buildErrorBox: "mt-4 rounded-2xl border border-rose-400/30 bg-rose-950/20 p-5 text-right",
  buildErrorTitle: "text-rose-100 font-semibold mb-2",
  buildErrorBody: "text-white/75 text-sm mb-4",
  buildErrorBtn:
    "rounded-xl bg-rose-500/90 text-white font-bold px-4 py-2 text-sm hover:bg-rose-400 min-h-10",

  skeleton: "h-[6.75rem] md:h-[7.75rem] rounded-2xl bg-white/[0.06] animate-pulse",
  loadingSpinner: "h-12 w-12 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin mb-4",
  loadingText: "text-white/90 text-lg font-medium",

  hubHeaderCard:
    "rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] px-4 py-4 md:px-6 md:py-5 mb-4 md:mb-5 shadow-sm text-center",
  hubBadge:
    "inline-flex items-center justify-center gap-2 w-fit px-4 py-2 md:px-5 rounded-full bg-white/10 text-sm md:text-base text-amber-200 font-bold border border-white/15 shadow-sm min-h-11",
  hubTitle: "text-xl md:text-2xl lg:text-3xl font-bold leading-tight text-white",
  hubDesc: "text-sm md:text-base text-white/70 max-w-2xl mx-auto leading-relaxed",
  hubBackLink:
    "inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-base md:text-lg font-bold text-white/90 hover:bg-white/10 hover:text-white transition min-h-11 shadow-sm shrink-0 leading-none",
  hubTopBar:
    "grid grid-cols-[1fr_auto_1fr] items-center gap-2 min-h-11 mb-3 md:mb-4",
  hubTopBarBack: "flex justify-start items-center min-h-11",
  hubTopBarTheme: "flex justify-end items-center min-h-11 w-full",

  hubCardBase:
    "group rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-3 md:p-4 flex flex-col text-right min-h-[7rem] md:min-h-[7.5rem] shadow-sm overflow-hidden transition-colors duration-200 hover:border-emerald-400/35 hover:from-emerald-950/25 hover:to-white/[0.05] hover:shadow-md",
  hubCardHeadRow: "flex items-center gap-2 justify-start mb-1.5 min-w-0",
  hubCardTitle: "font-bold text-sm md:text-base leading-snug text-white min-w-0 flex-1",
  hubCardBlurb: "text-[11px] md:text-xs text-white/60 leading-snug line-clamp-3 flex-1",
  hubCardEmoji:
    "inline-flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl text-xl md:text-2xl border shrink-0 bg-white/5",
  hubCardBar: "block h-1 w-full rounded-full mb-2.5 opacity-80",
});

export const SUBJECT_HUB_CARD_CLASSIC = Object.freeze({
  "math-master": {
    card: "hover:border-sky-400/30",
    bar: "bg-sky-400",
    emoji: "border-sky-400/25",
  },
  "geometry-master": {
    card: "hover:border-teal-400/30",
    bar: "bg-teal-400",
    emoji: "border-teal-400/25",
  },
  "english-master": {
    card: "hover:border-violet-400/30",
    bar: "bg-violet-400",
    emoji: "border-violet-400/25",
  },
  "science-master": {
    card: "hover:border-lime-400/30",
    bar: "bg-lime-500",
    emoji: "border-lime-400/25",
  },
  "hebrew-master": {
    card: "hover:border-rose-400/30",
    bar: "bg-rose-400",
    emoji: "border-rose-400/25",
  },
  "moledet-master": {
    card: "hover:border-amber-400/30",
    bar: "bg-amber-400",
    emoji: "border-amber-400/25",
  },
  "geography-master": {
    card: "hover:border-teal-400/30",
    bar: "bg-teal-500",
    emoji: "border-teal-400/25",
  },
  "moledet-geography-master": {
    card: "hover:border-amber-400/30",
    bar: "bg-amber-400",
    emoji: "border-amber-400/25",
  },
  "history-master": {
    card: "hover:border-orange-400/30",
    bar: "bg-orange-400",
    emoji: "border-orange-400/25",
  },
});

export const SUBJECT_ACCENT_BAR_CLASSIC = Object.freeze({
  "math-master": "bg-sky-500/70",
  "geometry-master": "bg-teal-500/70",
  "english-master": "bg-violet-500/70",
  "science-master": "bg-lime-500/70",
  "hebrew-master": "bg-rose-500/70",
  "moledet-master": "bg-amber-500/70",
  "geography-master": "bg-teal-500/70",
  "moledet-geography-master": "bg-amber-500/70",
  "history-master": "bg-orange-500/70",
});

export const STUDENT_HOME_MODAL_CLASSIC = Object.freeze({
  overlay: "fixed inset-0 z-[150] flex flex-col md:items-center md:justify-center bg-black/80 md:p-4",
  panel:
    "relative flex flex-col w-full h-full md:h-auto md:max-h-[90vh] md:rounded-2xl border-0 md:border-2 border-white/20 bg-gradient-to-b from-[#0a0f1d] to-[#141928] shadow-2xl overflow-hidden",
  header: "flex items-center justify-between gap-3 shrink-0 border-b border-white/10 px-4 py-3 md:px-5 md:py-4 bg-black/20",
  title: "text-lg md:text-xl font-bold text-white text-right min-w-0",
  closeBtn:
    "shrink-0 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-lg font-bold text-white/70 hover:text-white hover:bg-white/10 transition min-h-10 min-w-10",
  body: "flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 md:px-5 md:py-5",
  iconWrap: "shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-xl",
});

export const STUDENT_HOME_MODAL_BRIGHT = Object.freeze({
  overlay: "fixed inset-0 z-[150] flex flex-col md:items-center md:justify-center bg-slate-900/40 md:p-4",
  panel:
    "relative flex flex-col w-full h-full md:h-auto md:max-h-[90vh] md:rounded-2xl border-0 md:border border-sky-200 bg-white shadow-xl shadow-slate-300/30 overflow-hidden",
  header: "flex items-center justify-between gap-3 shrink-0 border-b px-4 py-3 md:px-5 md:py-4",
  title: "text-lg md:text-xl font-bold text-slate-900 text-right min-w-0",
  closeBtn:
    "shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-lg font-bold text-slate-600 hover:text-slate-800 hover:bg-sky-50 transition min-h-10 min-w-10",
  body: "flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 md:px-5 md:py-5 bg-gradient-to-b from-white to-sky-50/30",
  iconWrap: "shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl border text-xl",
});
