/** Classic (dark) theme — game hub parent screens only. */

export const GAMES_HUB_CLASSIC = Object.freeze({
  /** No min-h-screen — Layout shell already fills viewport; avoids extra scroll. */
  pageWrap: "text-white",
  container: "max-w-5xl mx-auto px-3 sm:px-4 py-4 md:py-8 pb-6 overflow-x-hidden",
  backBtn:
    "inline-flex items-center justify-center h-8 min-h-8 shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-semibold text-white/85 hover:bg-white/10 hover:text-white transition",
  hubTitle: "text-2xl md:text-4xl font-black text-white",
  hubSub: "text-sm md:text-base text-white/70 max-w-2xl mx-auto",
  badge:
    "inline-flex items-center justify-center gap-1.5 h-8 min-h-8 shrink-0 px-3 rounded-full bg-white/10 border border-white/20 text-sm font-semibold text-emerald-300",
  card:
    "flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:p-5 shadow-lg shadow-black/20 backdrop-blur-sm hover:border-white/20 transition",
  cardTitle: "text-lg md:text-xl font-bold text-white",
  cardBlurb: "text-sm text-white/70 leading-relaxed",
  cardMeta: "text-xs text-white/50 font-medium",
  cardEmoji: "text-4xl md:text-5xl",
  cardCta:
    "inline-flex items-center justify-center rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold text-sm px-4 py-2.5 transition disabled:cursor-not-allowed disabled:opacity-45",
  sectionTitle: "text-lg md:text-xl font-bold text-white mb-3",
  muted: "text-white/60",

  headerBorder: "border-white/10",
  cardDivider: "border-white/10",
  entryLabel: "text-[11px] font-semibold text-white/60",
  entryBtnSelected:
    "border-amber-400/80 bg-amber-500/25 text-amber-100 shadow-inner",
  entryBtnDefault:
    "border-white/15 bg-black/25 text-white/90 hover:border-amber-400/50 hover:bg-white/[0.06]",
  entryBtnDisabled:
    "cursor-not-allowed border-white/10 bg-black/20 text-white/30 line-through",
  bulletList: "text-[11px] text-white/65 sm:text-xs",
  bulletDot: "text-amber-400/80",
  idleBox: "border-amber-500/30 bg-amber-950/40 text-amber-100/95",
  btnSecondary:
    "rounded-lg bg-white/10 px-2 py-2 text-center text-[11px] font-bold text-white ring-1 ring-white/10 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-45 sm:text-xs",
  btnSecondaryOutline:
    "rounded-lg border border-white/20 bg-black/30 px-2 py-2 text-center text-[11px] font-bold text-white/95 transition hover:bg-black/40 disabled:cursor-not-allowed disabled:opacity-45 sm:text-xs",
  badgeActive: "bg-emerald-500/25 text-emerald-200 ring-1 ring-emerald-500/40",
  badgeInactive: "bg-white/10 text-white/50",
  emptyText: "text-xs text-white/55",
  roomItem: "rounded-lg border border-white/10 bg-black/25 p-2.5 sm:p-2",
  roomItemTitle: "font-semibold text-white text-[11px] sm:text-xs",
  roomItemMeta: "text-white/55 text-[11px] sm:text-xs",
  input:
    "w-full rounded-lg border border-white/15 bg-black/35 px-2.5 py-2 text-sm text-white placeholder:text-white/35",
  btnJoinCode:
    "rounded-lg bg-white/12 px-3 py-2 text-xs font-bold text-white ring-1 ring-white/15 transition hover:bg-white/18 disabled:opacity-45",
  btnJoinRoom:
    "rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45 sm:text-xs",
  skeleton: "h-56 animate-pulse rounded-2xl border border-white/5 bg-white/[0.04] sm:h-52",
  roomReadyPanel:
    "rounded-2xl border border-emerald-500/40 bg-emerald-950/35 p-4 shadow-lg ring-1 ring-emerald-500/20 sm:p-5",
  roomReadyTitle: "text-lg font-bold text-emerald-100",
  roomReadySub: "text-xs font-medium text-emerald-200/90 sm:text-sm",
  roomReadyDl: "text-xs text-emerald-100/90 sm:text-sm",
  roomReadyDlBorder: "border-emerald-500/25",
  roomReadyCodeBox: "rounded-lg border border-emerald-500/30 bg-black/30 px-3 py-2.5",
  roomReadyCodeLabel: "text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90",
  roomReadyCodeValue: "font-mono text-xl font-bold tracking-[0.15em] text-emerald-50 sm:text-2xl",
  roomReadyCodeHint: "text-[11px] text-emerald-200/85",
  userMessage: "border-amber-500/35 bg-amber-950/30 text-amber-100",
  nameText: "font-medium text-white/95",
  nameSep: "text-white/25",
  balanceBadge: "rounded-md bg-black/30 px-2 py-0.5 font-mono text-sm text-amber-200 ring-1 ring-white/10",
  balanceSuffix: "text-[11px] font-sans text-white/45",

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
  arcadeTabActive: "rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-white shadow",
  arcadeTabActiveCompact: "rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow",
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
    "flex h-[132px] min-w-0 flex-col rounded-lg border border-sky-200/60 bg-white/[0.97] p-2 shadow-sm",
  arcadeGameCardTitle:
    "truncate whitespace-nowrap text-base font-bold leading-tight text-indigo-900",
  arcadeGameCardBlurb: "line-clamp-2 text-[11px] leading-snug text-sky-800",
  arcadeGameCardMeta: "truncate text-xs leading-tight text-teal-700",
  arcadeGameCardSelected:
    "border-cyan-400 bg-cyan-50/90 ring-2 ring-inset ring-cyan-400/80",
  arcadeBadgeActive:
    "border border-emerald-200 bg-emerald-50 text-emerald-800",
  arcadeBadgeInactive:
    "border border-slate-200 bg-slate-50 text-slate-500",
  arcadeBtnSelect:
    "w-full rounded border border-sky-300 bg-sky-50/90 px-1.5 py-0.5 text-[11px] font-bold leading-tight text-sky-800 transition hover:bg-sky-100",
  arcadeBtnSelectSelected:
    "w-full rounded border border-teal-600 bg-teal-600 px-1.5 py-0.5 text-[11px] font-bold leading-tight text-white",
  arcadeActionDivider: "mt-3 border-t border-cyan-200 pt-3",
  arcadeActionTitle: "text-sm font-semibold text-indigo-900",
  arcadeActionMeta: "text-xs text-teal-700",
});
