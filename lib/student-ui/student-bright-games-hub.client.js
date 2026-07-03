/** Bright theme — game hub parent screens only. */

export const GAMES_HUB_BRIGHT = Object.freeze({
  /** No min-h-screen — Layout shell already fills viewport; avoids extra scroll. */
  pageWrap: "text-slate-800",
  container: "max-w-5xl mx-auto px-3 sm:px-4 py-4 md:py-8 pb-6 overflow-x-hidden",
  backBtn:
    "inline-flex items-center justify-center h-8 min-h-8 shrink-0 rounded-lg border border-sky-300 bg-white px-3 text-sm font-semibold text-sky-800 hover:bg-sky-50 hover:border-sky-400 transition shadow-sm",
  hubTitle: "text-2xl md:text-4xl font-extrabold text-slate-900",
  hubSub: "text-sm md:text-base text-slate-600 max-w-2xl mx-auto",
  badge:
    "inline-flex items-center justify-center gap-1.5 h-8 min-h-8 shrink-0 px-3 rounded-full bg-sky-100 border border-sky-300 text-sm font-semibold text-sky-800",
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

  arcadeHeader:
    "rounded-xl border border-sky-300 bg-sky-100 p-3 sm:p-4 shadow-sm",
  arcadeHeaderKicker: "text-xs font-semibold text-sky-700",
  arcadeHeaderTitle: "text-lg font-bold text-blue-900 sm:text-xl",
  arcadeHeaderGuest: "mt-1 text-xs text-amber-800",
  arcadeNavBadge:
    "inline-flex items-center justify-center gap-1.5 h-8 min-h-8 shrink-0 px-3 rounded-full bg-sky-50 border border-sky-200 text-sm font-semibold text-indigo-900 shadow-sm",
  arcadeNavTitle:
    "inline-flex max-w-[min(100%,14rem)] items-center justify-center px-2 text-center text-sm font-bold leading-tight text-indigo-900 sm:max-w-none sm:text-base",
  arcadeCoinBadge:
    "min-w-[4.75rem] rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-1.5 text-right shadow-sm",
  arcadeDiamondBadge:
    "min-w-[4.75rem] rounded-lg border border-sky-300 bg-blue-50 px-2.5 py-1.5 text-right shadow-sm",
  arcadeCoinLabel: "text-[10px] font-semibold text-amber-800",
  arcadeCoinValue: "text-sm font-bold text-amber-900 sm:text-base",
  arcadeDiamondLabel: "text-[10px] font-semibold text-sky-800",
  arcadeDiamondValue: "text-sm font-bold text-blue-900 sm:text-base",
  arcadeTabActive: "rounded-full bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white shadow",
  arcadeTabActiveCompact: "rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow",
  arcadeTabInactive:
    "rounded-full border border-sky-300 bg-sky-100 px-4 py-1.5 text-sm font-semibold text-sky-800 shadow-sm transition hover:bg-sky-200",
  arcadeTabInactiveCompact:
    "rounded-full border border-sky-300 bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800 shadow-sm transition hover:bg-sky-200",
  arcadeEntryBar:
    "rounded-xl border border-cyan-200 bg-cyan-50 p-3 shadow-sm",
  arcadeEntryLabel: "text-[11px] font-semibold text-sky-800",
  arcadePanelEvents:
    "rounded-xl border border-violet-200 bg-violet-50 shadow-sm",
  arcadePanelOpenRooms:
    "rounded-xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm text-right",
  arcadePanelJoinCode:
    "rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm text-right",
  arcadePanelFriends:
    "rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm text-right",
  arcadePanelShop:
    "rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm text-right",
  arcadePanelProfile:
    "rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm text-right",
  arcadePanelMissions:
    "rounded-xl border border-teal-200 bg-teal-50 p-4 shadow-sm text-right",
  arcadePanelMyRoom:
    "rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm text-right",
  arcadeSectionTitle: "text-base font-bold text-indigo-900",
  arcadePanelTitle: "font-bold text-blue-900",
  arcadeRoomItemTitle: "font-semibold text-blue-900 text-[11px] sm:text-xs",
  arcadePanelBlurb: "text-sm text-sky-800",
  arcadePanelMeta: "text-xs text-teal-700",
  arcadeEmptyText: "text-sm text-sky-700",
  arcadeRoomItem: "rounded-lg border border-sky-200 bg-white/60 p-2.5 sm:p-2",
  arcadeGameCard:
    "flex h-[132px] min-w-0 flex-col rounded-lg border border-sky-200 bg-white p-2 shadow-sm",
  arcadeGameCardTitle:
    "truncate whitespace-nowrap text-base font-bold leading-tight text-sky-950",
  arcadeGameCardBlurb: "line-clamp-2 text-[11px] leading-snug text-sky-800",
  arcadeGameCardMeta: "truncate text-xs leading-tight text-cyan-700",
  arcadeGameCardSelected:
    "border-sky-400 bg-sky-50/95 ring-2 ring-inset ring-sky-400/80",
  arcadeBadgeActive:
    "border border-emerald-200 bg-emerald-50 text-emerald-800",
  arcadeBadgeInactive:
    "border border-slate-200 bg-slate-50 text-slate-500",
  arcadeBtnSelect:
    "w-full rounded border border-sky-300 bg-sky-50/90 px-1.5 py-0.5 text-[11px] font-bold leading-tight text-sky-800 transition hover:bg-sky-100",
  arcadeBtnSelectSelected:
    "w-full rounded border border-sky-600 bg-sky-600 px-1.5 py-0.5 text-[11px] font-bold leading-tight text-white",
  arcadeActionDivider: "mt-3 border-t border-cyan-200 pt-3",
  arcadeActionTitle: "text-sm font-semibold text-indigo-900",
  arcadeActionMeta: "text-xs text-teal-700",
});
