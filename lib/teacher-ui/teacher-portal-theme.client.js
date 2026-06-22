/**
 * Bright / classic UI tokens for private-teacher dashboard only.
 * @param {boolean} isBright
 */
export function getTeacherPortalTheme(isBright) {
  if (isBright) {
    return {
      heading: "text-slate-900",
      subheading: "text-slate-600",
      muted: "text-slate-600",
      faint: "text-slate-500",
      logoutBtn:
        "text-sm px-3 py-1.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-sky-50 shrink-0 shadow-sm",
      section: "rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5",
      statLabel: "text-xs text-slate-500 mb-1",
      statValue: "text-2xl font-bold text-slate-900",
      linkViolet: "text-sm text-violet-700 hover:underline font-medium w-fit",
      linkEmerald: "text-sm text-emerald-700 hover:underline font-medium w-fit",
      attentionSection:
        "rounded-xl border border-amber-200 bg-amber-50/90 shadow-sm p-4 sm:p-5",
      attentionCard:
        "rounded-lg border border-amber-100 bg-white p-3 text-sm flex flex-col gap-1 shadow-sm",
      attentionSeverity: "text-xs text-amber-800",
      attentionMeta: "text-slate-600 text-xs",
      attentionTopic: "text-slate-700 text-xs",
      attentionLink: "text-amber-700 text-xs hover:underline mt-1 font-medium",
      classSection: "rounded-xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5",
      classCard: "rounded-lg border border-slate-200 bg-slate-50 p-3 flex flex-col gap-2",
      classCardActive: "rounded-lg border border-amber-300 bg-amber-50 p-3 flex flex-col gap-2",
      classMeta: "text-sm text-slate-600 mt-1",
      classSubjects: "text-sm text-slate-500 mt-0.5",
      rosterTabActiveDirect:
        "text-xs sm:text-sm px-3 py-1.5 rounded-full border transition bg-violet-100 border-violet-300 text-violet-900",
      rosterTabActiveClass:
        "text-xs sm:text-sm px-3 py-1.5 rounded-full border transition bg-amber-100 border-amber-300 text-amber-900",
      rosterTabIdle:
        "text-xs sm:text-sm px-3 py-1.5 rounded-full border transition border-slate-200 text-slate-600 hover:bg-sky-50",
      filterChipActive:
        "text-xs px-3 py-1.5 rounded-full border transition bg-amber-100 border-amber-300 text-amber-900",
      filterChipIdle:
        "text-xs px-3 py-1.5 rounded-full border transition border-slate-200 text-slate-600 hover:bg-sky-50",
      sortActive: "px-2 py-1 rounded text-amber-700 font-semibold",
      sortIdle: "px-2 py-1 rounded text-slate-500 hover:text-slate-800",
      searchInput:
        "w-full rounded-lg bg-white border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm",
      studentCard:
        "rounded-lg border border-slate-200 bg-white shadow-sm p-2.5 sm:p-3 flex flex-col gap-1.5 min-w-0 h-full",
      studentStats: "text-[10px] sm:text-xs text-slate-600 leading-snug break-words",
      studentReportLink:
        "mt-auto w-full rounded border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold px-2 py-1.5 hover:bg-amber-100 text-center",
      emptyHint: "text-slate-600 text-sm",
      emptySection:
        "rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4 sm:p-5",
      emptyLabel: "text-slate-700",
      emptyInput:
        "mt-1 w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-sm text-right shadow-sm",
      error: "text-sm text-rose-600",
      modalOverlay: "absolute inset-0 bg-slate-900/40",
      modalPanel:
        "rounded-xl border border-slate-200 bg-white p-5 w-full shadow-xl text-slate-900",
      modalClose: "text-slate-500 text-sm hover:text-slate-800",
      input:
        "flex-1 min-w-0 rounded bg-white border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm",
      inputSm:
        "flex-1 min-w-0 rounded bg-white border border-slate-300 px-2 py-1.5 text-sm text-slate-900 shadow-sm",
      label: "block text-sm text-slate-700 mb-1",
      panelListItem: "rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2",
      ghostLink: "text-xs text-amber-700 font-semibold shrink-0",
      mutedLink: "text-xs text-slate-500",
      dangerLink: "text-xs text-rose-600",
      successLink: "text-emerald-700 text-xs font-semibold",
      secondaryBtn:
        "text-xs rounded border border-slate-200 bg-white px-3 py-1.5 hover:bg-sky-50 text-slate-700",
      primaryBtn:
        "shrink-0 rounded bg-amber-500 text-black text-sm font-semibold px-3 py-2 disabled:opacity-60 hover:bg-amber-400",
      emeraldBtn:
        "shrink-0 rounded bg-emerald-600 text-white text-sm font-semibold px-3 py-2 disabled:opacity-60 hover:bg-emerald-700",
      amberReportBtn:
        "text-xs rounded bg-amber-500 text-black font-semibold px-3 py-1.5 hover:bg-amber-400",
      amberOutlineBtn:
        "text-xs rounded border border-amber-300 text-amber-800 px-3 py-1.5 hover:bg-amber-50",
      warningText: "text-sm text-amber-800 mb-2",
      shellTitle: "text-2xl font-bold mb-6 text-slate-900",
      shellLoading: "text-slate-500",
      shellError: "text-rose-600",
      loginTabActive: "bg-sky-600 text-white shadow-sm",
      loginTabIdle:
        "bg-white border border-slate-200 text-slate-600 hover:bg-sky-50 hover:border-sky-300",
      portalAuxBtn:
        "flex-1 min-w-0 rounded px-2 py-2 text-xs sm:text-sm font-semibold text-center bg-slate-100 border border-slate-200 text-slate-700 hover:bg-sky-50 transition",
      loginLabel: "text-slate-700",
      loginInputMt:
        "mt-1 w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 shadow-sm",
      submitBtn:
        "w-full rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 disabled:opacity-60 shadow-sm",
      forgotLink: "text-sky-700 underline hover:text-sky-900",
      inviteNote: "text-sm text-slate-600",
      regTitle: "text-base md:text-xl font-bold mb-1 text-slate-900",
      regSuccess: "text-sm text-emerald-700",
      regHint: "text-xs text-slate-500 leading-snug",
      regLegend: "text-slate-700 mb-1",
      regSubjectChip:
        "inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 md:px-2 md:py-1 cursor-pointer text-[11px] md:text-xs leading-tight",
      regTextarea:
        "mt-0.5 w-full rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-sm text-slate-900 shadow-sm resize-y min-h-[3.75rem] md:min-h-[4.5rem] max-h-28",
      pendingHeading: "text-xl font-bold text-slate-900",
      pendingBody: "text-sm text-slate-600 leading-relaxed",
    };
  }

  return {
    heading: "text-white",
    subheading: "text-white/60",
    muted: "text-white/60",
    faint: "text-white/50",
    logoutBtn:
      "text-sm px-3 py-1.5 rounded border border-white/20 hover:bg-white/10 shrink-0",
    section: "rounded-xl border border-white/15 bg-black/30 p-4 sm:p-5",
    statLabel: "text-xs text-white/50 mb-1",
    statValue: "text-2xl font-bold",
    linkViolet: "text-sm text-violet-300 hover:underline font-medium w-fit",
    linkEmerald: "text-sm text-emerald-300 hover:underline font-medium w-fit",
    attentionSection:
      "rounded-xl border border-amber-400/25 bg-amber-500/5 p-4 sm:p-5",
    attentionCard:
      "rounded-lg border border-white/10 bg-black/30 p-3 text-sm flex flex-col gap-1",
    attentionSeverity: "text-xs text-amber-200",
    attentionMeta: "text-white/50 text-xs",
    attentionTopic: "text-white/70 text-xs",
    attentionLink: "text-amber-300 text-xs hover:underline mt-1",
    classSection: "rounded-xl border border-white/15 bg-black/30 p-4 sm:p-5",
    classCard: "rounded-lg border border-white/10 bg-black/20 p-3 flex flex-col gap-2",
    classCardActive: "rounded-lg border border-amber-400/50 bg-amber-500/10 p-3 flex flex-col gap-2",
    classMeta: "text-sm text-white/65 mt-1",
    classSubjects: "text-sm text-white/55 mt-0.5",
    rosterTabActiveDirect:
      "text-xs sm:text-sm px-3 py-1.5 rounded-full border transition bg-violet-500/25 border-violet-400/50 text-violet-100",
    rosterTabActiveClass:
      "text-xs sm:text-sm px-3 py-1.5 rounded-full border transition bg-amber-500/20 border-amber-400/50 text-amber-100",
    rosterTabIdle:
      "text-xs sm:text-sm px-3 py-1.5 rounded-full border transition border-white/15 text-white/70 hover:bg-white/5",
    filterChipActive:
      "text-xs px-3 py-1.5 rounded-full border transition bg-amber-500/20 border-amber-400/50 text-amber-100",
    filterChipIdle:
      "text-xs px-3 py-1.5 rounded-full border transition border-white/15 text-white/70 hover:bg-white/5",
    sortActive: "px-2 py-1 rounded text-amber-300 font-semibold",
    sortIdle: "px-2 py-1 rounded text-white/60",
    searchInput:
      "w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2.5 text-sm",
    studentCard:
      "rounded-lg border border-white/10 bg-black/30 p-2.5 sm:p-3 flex flex-col gap-1.5 min-w-0 h-full",
    studentStats: "text-[10px] sm:text-xs text-white/60 leading-snug break-words",
    studentReportLink:
      "mt-auto w-full rounded border border-amber-400/40 text-amber-300 text-xs font-semibold px-2 py-1.5 hover:bg-amber-500/10 text-center",
    emptyHint: "text-white/60 text-sm",
    emptySection:
      "rounded-xl border border-dashed border-white/20 bg-black/20 p-4 sm:p-5",
    emptyLabel: "text-white/70",
    emptyInput:
      "mt-1 w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-sm text-right",
    error: "text-red-300 text-sm",
    modalOverlay: "absolute inset-0 bg-black/70",
    modalPanel:
      "rounded-xl border border-white/15 bg-gray-900 p-5 w-full shadow-xl",
    modalClose: "text-white/60 text-sm",
    input:
      "flex-1 min-w-0 rounded bg-black/40 border border-white/20 px-3 py-2 text-sm",
    inputSm:
      "flex-1 min-w-0 rounded bg-black/40 border border-white/20 px-2 py-1.5 text-sm",
    label: "block text-sm text-white/70 mb-1",
    panelListItem: "rounded-lg border border-white/10 bg-black/30 p-3 space-y-2",
    ghostLink: "text-xs text-amber-300 font-semibold shrink-0",
    mutedLink: "text-xs text-white/60",
    dangerLink: "text-xs text-red-300",
    successLink: "text-emerald-300 text-xs font-semibold",
    secondaryBtn:
      "text-xs rounded border border-white/25 px-3 py-1.5 hover:bg-white/10",
    primaryBtn:
      "shrink-0 rounded bg-amber-500 text-black text-sm font-semibold px-3 py-2 disabled:opacity-60",
    emeraldBtn:
      "shrink-0 rounded bg-emerald-600 text-white text-sm font-semibold px-3 py-2 disabled:opacity-60",
    amberReportBtn:
      "text-xs rounded bg-amber-500 text-black font-semibold px-3 py-1.5",
    amberOutlineBtn:
      "text-xs rounded border border-amber-400/40 text-amber-200 px-3 py-1.5 hover:bg-amber-500/10",
    warningText: "text-sm text-amber-200 mb-2",
    shellTitle: "text-2xl font-bold mb-6",
    shellLoading: "text-white/60",
    shellError: "text-red-300",
    loginTabActive: "bg-amber-500 text-black",
    loginTabIdle: "bg-white/10 text-white/80 hover:bg-white/15",
    portalAuxBtn:
      "flex-1 min-w-0 rounded px-2 py-2 text-xs sm:text-sm font-semibold text-center bg-white/10 text-white/80 hover:bg-white/15 transition",
    loginLabel: "text-white/80",
    loginInputMt: "mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2",
    submitBtn: "w-full rounded bg-amber-500 text-black font-semibold py-2 disabled:opacity-60",
    forgotLink: "text-amber-300 underline",
    inviteNote: "text-white/70 text-sm",
    regTitle: "text-base md:text-xl font-bold mb-1",
    regSuccess: "text-emerald-300 text-sm",
    regHint: "text-xs text-white/50 leading-snug",
    regLegend: "text-white/80 mb-1",
    regSubjectChip:
      "inline-flex items-center gap-1 rounded border border-white/20 px-1.5 py-0.5 md:px-2 md:py-1 cursor-pointer text-[11px] md:text-xs leading-tight",
    regTextarea:
      "mt-0.5 w-full rounded bg-black/40 border border-white/20 px-3 py-1.5 text-sm resize-y min-h-[3.75rem] md:min-h-[4.5rem] max-h-28",
    pendingHeading: "text-xl font-bold",
    pendingBody: "text-white/70 text-sm leading-relaxed",
  };
}

/** Layout chrome for private-teacher portal pages (login, pending, dashboard). */
export function getPrivateTeacherLayoutProps(theme) {
  return {
    studentTheme: theme,
    studentShell: "home",
    layoutShowThemePicker: true,
  };
}

/** Private teachers use Supabase JWT; school staff use the staff cookie on shared routes. */
export function isPrivateTeacherPortalAuth(authMethod) {
  return authMethod !== "staff_cookie";
}

/**
 * @param {string|null|undefined} badge
 * @param {boolean} isBright
 */
export function teacherStatusBadgeClass(badge, isBright) {
  if (isBright) {
    switch (badge) {
      case "חזק":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "תקין":
        return "bg-sky-100 text-sky-800 border-sky-200";
      case "במעקב":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "צריך חיזוק":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "דורש התערבות":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  }

  switch (badge) {
    case "חזק":
      return "bg-emerald-500/20 text-emerald-200 border-emerald-400/40";
    case "תקין":
      return "bg-sky-500/20 text-sky-200 border-sky-400/40";
    case "במעקב":
      return "bg-amber-500/20 text-amber-200 border-amber-400/40";
    case "צריך חיזוק":
      return "bg-orange-500/20 text-orange-200 border-orange-400/40";
    case "דורש התערבות":
      return "bg-red-500/20 text-red-200 border-red-400/40";
    default:
      return "bg-white/10 text-white/70 border-white/20";
  }
}
