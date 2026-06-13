/** Bright theme — game hub parent screens only. */

export const GAMES_HUB_BRIGHT = Object.freeze({
  pageWrap: "min-h-screen bg-gradient-to-b from-[#EAF6FF] via-[#F0F9FF] to-[#F8FAFC] text-slate-800",
  container: "max-w-5xl mx-auto px-3 sm:px-4 py-4 md:py-8 pb-6 overflow-x-hidden",
  backBtn:
    "inline-flex items-center rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-sm font-semibold text-sky-800 hover:bg-sky-50 hover:border-sky-400 transition shadow-sm min-h-11",
  hubTitle: "text-2xl md:text-4xl font-extrabold text-slate-900",
  hubSub: "text-sm md:text-base text-slate-600 max-w-2xl mx-auto",
  badge:
    "inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-100 border border-sky-300 text-sm font-semibold text-sky-800",
  card:
    "flex h-full flex-col rounded-2xl border-2 border-sky-200 bg-white p-4 md:p-5 shadow-md shadow-sky-100/80 hover:border-sky-400 hover:shadow-lg transition",
  cardTitle: "text-lg md:text-xl font-bold text-slate-900",
  cardBlurb: "text-sm text-slate-600 leading-relaxed",
  cardMeta: "text-xs text-slate-500 font-medium",
  cardEmoji: "text-4xl md:text-5xl",
  cardCta:
    "inline-flex items-center justify-center rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm px-4 py-2.5 shadow-sm transition disabled:cursor-not-allowed disabled:opacity-45",
  sectionTitle: "text-lg md:text-xl font-bold text-slate-900 mb-3",
  muted: "text-slate-500",

  headerBorder: "border-slate-200",
  cardDivider: "border-sky-200",
  entryLabel: "text-[11px] font-semibold text-slate-600",
  entryBtnSelected:
    "border-amber-400 bg-amber-100 text-amber-900 shadow-inner",
  entryBtnDefault:
    "border-sky-300 bg-white text-slate-800 hover:border-amber-400 hover:bg-amber-50",
  entryBtnDisabled:
    "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through",
  bulletList: "text-[11px] text-slate-600 sm:text-xs",
  bulletDot: "text-amber-600",
  idleBox: "border-amber-300 bg-amber-50 text-amber-900",
  btnSecondary:
    "rounded-lg bg-sky-50 px-2 py-2 text-center text-[11px] font-bold text-sky-900 ring-1 ring-sky-200 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-45 sm:text-xs",
  btnSecondaryOutline:
    "rounded-lg border border-sky-300 bg-white px-2 py-2 text-center text-[11px] font-bold text-slate-800 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-45 sm:text-xs",
  badgeActive: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300",
  badgeInactive: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  emptyText: "text-xs text-slate-500",
  roomItem: "rounded-lg border border-sky-200 bg-sky-50/80 p-2.5 sm:p-2",
  roomItemTitle: "font-semibold text-slate-900 text-[11px] sm:text-xs",
  roomItemMeta: "text-slate-600 text-[11px] sm:text-xs",
  input:
    "w-full rounded-lg border border-sky-300 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400",
  btnJoinCode:
    "rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-sky-700 disabled:opacity-45",
  btnJoinRoom:
    "rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45 sm:text-xs",
  skeleton: "h-56 animate-pulse rounded-2xl border border-sky-200 bg-sky-100/80 sm:h-52",
  roomReadyPanel: "rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 shadow-md ring-1 ring-emerald-200 sm:p-5",
  roomReadyTitle: "text-lg font-bold text-emerald-900",
  roomReadySub: "text-xs font-medium text-emerald-800 sm:text-sm",
  roomReadyDl: "text-xs text-emerald-900 sm:text-sm",
  roomReadyDlBorder: "border-emerald-200",
  roomReadyCodeBox: "rounded-lg border border-emerald-300 bg-white px-3 py-2.5",
  roomReadyCodeLabel: "text-[10px] font-semibold uppercase tracking-wide text-emerald-700",
  roomReadyCodeValue: "font-mono text-xl font-bold tracking-[0.15em] text-emerald-900 sm:text-2xl",
  roomReadyCodeHint: "text-[11px] text-emerald-700",
  userMessage: "border-amber-300 bg-amber-50 text-amber-900",
  nameText: "font-medium text-slate-800",
  nameSep: "text-slate-300",
  balanceBadge: "rounded-md bg-amber-50 px-2 py-0.5 font-mono text-sm text-amber-800 ring-1 ring-amber-200",
  balanceSuffix: "text-[11px] font-sans text-amber-700/70",
});
