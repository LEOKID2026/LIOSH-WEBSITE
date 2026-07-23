/**
 * Bright / classic UI tokens for parent login + dashboard only (not parent report).
 * @param {boolean} isBright
 */
export function getParentPortalTheme(isBright) {
  if (isBright) {
    return {
      label: "text-slate-700",
      muted: "text-slate-600",
      faint: "text-slate-500",
      heading: "text-slate-900",
      subheading: "text-slate-600",
      email: "text-slate-500",
      input:
        "w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 shadow-sm disabled:opacity-50",
      inputMt:
        "mt-1 w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-slate-900 shadow-sm disabled:opacity-50",
      passwordInput:
        "w-full rounded-lg bg-white border border-slate-300 px-3 py-2 pe-10 text-slate-900 shadow-sm",
      passwordToggle:
        "absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-800 px-1",
      submit:
        "w-full rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 disabled:opacity-60 shadow-sm",
      tabActive: "bg-sky-600 text-white shadow-sm",
      tabIdle:
        "bg-white border border-slate-200 text-slate-600 hover:bg-sky-50 hover:border-sky-300",
      infoBox:
        "mb-3 rounded-lg border border-sky-200 bg-sky-50/90 px-3.5 py-3 space-y-2 text-right shadow-sm",
      infoTitle: "text-base font-bold text-slate-900 leading-snug",
      infoText: "text-sm text-slate-700 leading-relaxed",
      link: "text-sky-700 underline hover:text-sky-900",
      linkInline: "text-sky-700 underline mx-1 hover:text-sky-900",
      error: "text-sm text-rose-600",
      message: "text-sm text-slate-600 leading-relaxed",
      success: "text-xs text-emerald-700",
      warning: "text-sm text-amber-800",
      loading: "text-sm text-slate-500",
      card:
        "rounded-xl border border-slate-200 bg-white shadow-sm p-3.5 md:p-5 md:min-h-[168px] flex flex-col justify-between gap-3 md:gap-4",
      cardTitle: "font-bold text-base md:text-lg text-slate-900 truncate",
      cardMeta: "text-sm text-slate-500 mt-1",
      cardAction:
        "flex-1 min-w-0 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs font-medium text-slate-800 text-center sm:text-sm sm:py-2.5 md:px-3 md:py-2.5 md:min-h-[42px] md:text-sm hover:bg-sky-50 hover:border-sky-200 transition disabled:opacity-60 leading-snug",
      cardReportBtn:
        "flex-1 min-w-0 inline-flex items-center justify-center rounded-lg border border-sky-300 bg-sky-50 px-2 py-2 text-xs font-semibold text-sky-800 text-center sm:text-sm sm:py-2.5 md:px-3 md:py-2.5 md:min-h-[42px] md:text-sm hover:bg-sky-100 hover:border-sky-400 transition disabled:opacity-60 leading-snug shadow-sm",
      cardActivityBtn:
        "flex-1 min-w-0 inline-flex items-center justify-center rounded-lg border border-violet-300 bg-violet-50 px-2 py-2 text-xs font-semibold text-violet-800 text-center sm:text-sm sm:py-2.5 md:px-3 md:py-2.5 md:min-h-[42px] md:text-sm hover:bg-violet-100 hover:border-violet-400 transition disabled:opacity-60 leading-snug shadow-sm",
      cardDetailsBtn:
        "flex-1 min-w-0 inline-flex items-center justify-center rounded-lg border border-teal-300 bg-teal-50 px-2 py-2 text-xs font-semibold text-teal-800 text-center sm:text-sm sm:py-2.5 md:px-3 md:py-2.5 md:min-h-[42px] md:text-sm hover:bg-teal-100 hover:border-teal-400 transition disabled:opacity-60 leading-snug shadow-sm",
      headerCurriculumBtn:
        "inline-flex items-center justify-center rounded-lg border border-indigo-300 bg-indigo-50 px-2 py-2 text-xs font-semibold text-indigo-800 text-center md:px-4 md:py-2.5 md:text-sm hover:bg-indigo-100 hover:border-indigo-400 transition leading-tight shadow-sm",
      headerShareBtn:
        "inline-flex items-center justify-center rounded-lg border border-rose-300 bg-rose-50 px-2 py-2 text-xs font-semibold text-rose-800 text-center md:px-4 md:py-2.5 md:text-sm hover:bg-rose-100 hover:border-rose-400 transition leading-tight shadow-sm",
      headerStudentWorldBtn:
        "inline-flex items-center justify-center rounded-lg border border-red-500 bg-red-600 px-2 py-2 text-xs font-semibold text-white text-center whitespace-nowrap md:px-4 md:py-2.5 md:text-sm hover:bg-red-700 hover:border-red-600 transition leading-tight shadow-sm",
      primaryBtn:
        "rounded-lg bg-sky-600 text-white px-3 py-2 md:px-4 md:py-2.5 text-sm font-semibold hover:bg-sky-700 transition shadow-sm",
      amberBtn:
        "rounded-lg bg-amber-500 text-black px-3 py-2 md:px-4 md:py-2.5 text-sm font-semibold hover:bg-amber-400 transition",
      secondaryBtn:
        "rounded-lg border border-slate-200 bg-white px-3 py-2 md:px-4 md:py-2.5 text-sm text-slate-700 hover:bg-sky-50 hover:border-sky-200 transition",
      skyBtn: "rounded-xl bg-sky-600 text-white px-3 py-2 font-semibold hover:bg-sky-700 disabled:opacity-60 shadow-sm",
      panel: "rounded-lg border border-slate-200 p-3 bg-slate-50 space-y-3",
      panelTitle: "font-semibold text-slate-900",
      confirmBox: "rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2 text-sm",
      confirmTitle: "font-semibold text-emerald-800",
      confirmStrong: "text-slate-900",
      ghostBtn: "rounded-lg bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200",
      copyBtn: "rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200",
      deleteBtn:
        "rounded-lg border border-rose-300 text-rose-700 px-3 py-2 text-sm disabled:opacity-60 hover:bg-rose-50",
      modalOverlay:
        "fixed inset-0 z-[150] flex flex-col md:items-center md:justify-center bg-slate-900/40 md:p-4",
      modalPanel:
        "relative flex flex-col w-full h-full md:h-auto md:max-h-[90vh] md:rounded-xl border-0 md:border border-slate-200 bg-white shadow-2xl overflow-hidden",
      modalHeader:
        "flex items-center justify-between gap-3 shrink-0 border-b border-slate-200 px-4 py-3 md:px-5 md:py-4",
      modalTitle: "text-lg md:text-xl font-bold text-slate-900 text-right min-w-0",
      modalClose:
        "shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-lg font-bold text-slate-600 hover:text-slate-900 hover:bg-sky-50 transition",
      deleteOverlay: "fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/40 p-4",
      deletePanel:
        "max-w-md w-full rounded-lg border border-rose-200 bg-white p-4 space-y-3 shadow-xl",
      deleteTitle: "text-lg font-bold text-slate-900",
      deleteText: "text-sm text-slate-700 leading-relaxed",
      deleteHint: "text-xs text-slate-500",
      deleteStrong: "text-slate-900",
      deleteCancel:
        "rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-800 hover:bg-slate-200",
      deleteConfirm:
        "rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-rose-700",
      activityOverlay:
        "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4",
      activityPanel:
        "w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-xl space-y-4 text-slate-900",
      activityClose:
        "rounded-lg bg-slate-100 px-2 py-1 text-sm text-slate-700 hover:bg-slate-200",
      activityError:
        "text-rose-700 text-sm rounded border border-rose-200 bg-rose-50 px-3 py-2",
      activityPreviewBtn:
        "rounded-lg border border-sky-300 bg-sky-50 text-sky-800 px-3 py-2 text-sm font-semibold hover:bg-sky-100 disabled:opacity-60",
      activitySendBtn:
        "rounded-lg border border-violet-300 bg-violet-50 text-violet-800 px-3 py-2 text-sm font-semibold hover:bg-violet-100 disabled:opacity-60",
      activityPreviewItem: "rounded border border-slate-200 bg-slate-50 px-3 py-2",
      activityPreviewIndex: "shrink-0 text-slate-500",
      permissionsBox: "rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3",
      permissionsTitle: "text-sm font-semibold text-slate-900 text-right",
      permissionsHint: "text-xs text-slate-500 text-right",
      permissionsRow:
        "flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2",
      permissionsLabel: "text-sm text-slate-800 text-right flex-1",
      gateBox: "rounded-xl border border-amber-200 bg-amber-50 p-5 sm:p-6 space-y-4 text-right",
      gateText: "text-sm text-slate-700 leading-relaxed",
      gateSecondary:
        "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50",
      guardianBox: "rounded-xl border border-amber-200 bg-amber-50 p-4 text-right space-y-3",
      guardianText: "text-sm text-amber-900",
      guardianBtn:
        "w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-sky-50 disabled:opacity-50 text-right text-slate-800",
    };
  }

  return {
    label: "text-white/80",
    muted: "text-white/70",
    faint: "text-white/60",
    heading: "text-white",
    subheading: "text-white/60",
    email: "text-white/60",
    input: "w-full rounded bg-black/40 border border-white/20 px-3 py-2 disabled:opacity-50",
    inputMt: "mt-1 w-full rounded bg-black/40 border border-white/20 px-3 py-2 disabled:opacity-50",
    passwordInput: "w-full rounded bg-black/40 border border-white/20 px-3 py-2 pe-10",
    passwordToggle:
      "absolute left-2 top-1/2 -translate-y-1/2 text-xs text-white/70 hover:text-white px-1",
    submit: "w-full rounded bg-amber-500 text-black font-semibold py-2 disabled:opacity-60",
    tabActive: "bg-amber-500 text-black",
    tabIdle: "bg-white/10 text-white/80",
    infoBox: "mb-3 rounded-lg border border-white/10 bg-white/5 px-3.5 py-3 space-y-2 text-right",
    infoTitle: "text-base font-bold text-white leading-snug",
    infoText: "text-sm text-white/80 leading-relaxed",
    link: "text-amber-300 underline",
    linkInline: "text-amber-300 underline mx-1",
    error: "text-sm text-red-300",
    message: "text-sm text-white/75 leading-relaxed",
    success: "text-xs text-emerald-300/90",
    warning: "text-sm text-amber-200",
    loading: "text-sm text-white/70",
    card:
      "rounded-xl border border-white/10 bg-white/[0.04] p-3.5 md:p-5 md:min-h-[168px] flex flex-col justify-between gap-3 md:gap-4",
    cardTitle: "font-bold text-base md:text-lg text-white truncate",
    cardMeta: "text-sm text-white/55 mt-1",
    cardAction:
      "flex-1 min-w-0 inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-2 py-2 text-xs font-medium text-white/85 text-center sm:text-sm sm:py-2.5 md:px-3 md:py-2.5 md:min-h-[42px] md:text-sm hover:bg-white/[0.07] hover:border-white/25 transition disabled:opacity-60 leading-snug",
    cardReportBtn:
      "flex-1 min-w-0 inline-flex items-center justify-center rounded-lg border border-sky-500/45 bg-sky-950/35 px-2 py-2 text-xs font-semibold text-sky-100 text-center sm:text-sm sm:py-2.5 md:px-3 md:py-2.5 md:min-h-[42px] md:text-sm hover:bg-sky-900/50 hover:border-sky-400/60 transition disabled:opacity-60 leading-snug",
    cardActivityBtn:
      "flex-1 min-w-0 inline-flex items-center justify-center rounded-lg border border-violet-500/45 bg-violet-950/35 px-2 py-2 text-xs font-semibold text-violet-100 text-center sm:text-sm sm:py-2.5 md:px-3 md:py-2.5 md:min-h-[42px] md:text-sm hover:bg-violet-900/50 hover:border-violet-400/60 transition disabled:opacity-60 leading-snug",
    cardDetailsBtn:
      "flex-1 min-w-0 inline-flex items-center justify-center rounded-lg border border-amber-500/45 bg-amber-950/30 px-2 py-2 text-xs font-semibold text-amber-100 text-center sm:text-sm sm:py-2.5 md:px-3 md:py-2.5 md:min-h-[42px] md:text-sm hover:bg-amber-900/45 hover:border-amber-400/60 transition disabled:opacity-60 leading-snug",
    headerCurriculumBtn:
      "inline-flex items-center justify-center rounded-lg border border-indigo-500/45 bg-indigo-950/35 px-2 py-2 text-xs font-semibold text-indigo-100 text-center md:px-4 md:py-2.5 md:text-sm hover:bg-indigo-900/50 hover:border-indigo-400/60 transition leading-tight",
      headerShareBtn:
        "inline-flex items-center justify-center rounded-lg border border-rose-500/45 bg-rose-950/35 px-2 py-2 text-xs font-semibold text-rose-100 text-center md:px-4 md:py-2.5 md:text-sm hover:bg-rose-900/50 hover:border-rose-400/60 transition leading-tight",
      headerStudentWorldBtn:
        "inline-flex items-center justify-center rounded-lg border border-red-500/70 bg-red-600 px-2 py-2 text-xs font-semibold text-white text-center whitespace-nowrap md:px-4 md:py-2.5 md:text-sm hover:bg-red-500 hover:border-red-400 transition leading-tight shadow-sm",
    primaryBtn:
      "rounded-lg bg-amber-500 text-black px-3 py-2 md:px-4 md:py-2.5 text-sm font-semibold hover:bg-amber-400 transition",
    amberBtn:
      "rounded-lg bg-amber-500 text-black px-3 py-2 md:px-4 md:py-2.5 text-sm font-semibold hover:bg-amber-400 transition",
    secondaryBtn:
      "rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 md:px-4 md:py-2.5 text-sm text-white/80 hover:bg-white/[0.07] hover:border-white/25 transition",
    skyBtn: "rounded bg-sky-400 text-black px-3 py-2 font-semibold disabled:opacity-60",
    panel: "rounded border border-white/15 p-3 bg-black/30 space-y-3",
    panelTitle: "font-semibold text-white",
    confirmBox: "rounded border border-emerald-500/40 bg-emerald-950/40 p-3 space-y-2 text-sm",
    confirmTitle: "font-semibold text-emerald-200",
    confirmStrong: "text-white",
    ghostBtn: "rounded bg-white/15 px-3 py-1 text-xs text-white/90 hover:bg-white/20",
    copyBtn: "rounded bg-white/10 px-2 py-1 text-xs text-white/90 hover:bg-white/15",
    deleteBtn:
      "rounded border border-red-500/60 text-red-300 px-3 py-2 text-sm disabled:opacity-60 hover:bg-red-950/40",
    modalOverlay:
      "fixed inset-0 z-[150] flex flex-col md:items-center md:justify-center bg-black/80 md:p-4",
    modalPanel:
      "relative flex flex-col w-full h-full md:h-auto md:max-h-[90vh] md:rounded-xl border-0 md:border border-white/10 bg-[#0a0f1d] shadow-2xl overflow-hidden",
    modalHeader:
      "flex items-center justify-between gap-3 shrink-0 border-b border-white/10 px-4 py-3 md:px-5 md:py-4",
    modalTitle: "text-lg md:text-xl font-bold text-white text-right min-w-0",
    modalClose:
      "shrink-0 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-lg font-bold text-white/80 hover:text-white hover:bg-white/10 transition",
    deleteOverlay: "fixed inset-0 z-[160] flex items-center justify-center bg-black/75 p-4",
    deletePanel:
      "max-w-md w-full rounded-lg border border-red-500/35 bg-[#0f1629] p-4 space-y-3 shadow-xl",
    deleteTitle: "text-lg font-bold text-white",
    deleteText: "text-sm text-white/85 leading-relaxed",
    deleteHint: "text-xs text-white/65",
    deleteStrong: "text-white",
    deleteCancel: "rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15",
    deleteConfirm:
      "rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-red-700",
    activityOverlay: "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4",
    activityPanel:
      "w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/15 bg-slate-900 p-5 shadow-xl space-y-4",
    activityClose: "rounded bg-white/10 px-2 py-1 text-sm hover:bg-white/20",
    activityError: "text-red-200 text-sm rounded border border-red-400/30 bg-red-500/10 px-3 py-2",
    activityPreviewBtn:
      "rounded border border-sky-500/40 bg-sky-950/30 text-sky-100 px-3 py-2 text-sm font-semibold hover:bg-sky-900/40 disabled:opacity-60",
    activitySendBtn:
      "rounded border border-violet-500/40 bg-violet-950/30 text-violet-100 px-3 py-2 text-sm font-semibold hover:bg-violet-900/40 disabled:opacity-60",
    activityPreviewItem: "rounded border border-white/10 bg-black/30 px-3 py-2",
    activityPreviewIndex: "shrink-0 text-white/70",
    permissionsBox: "rounded-xl border border-white/10 bg-white/5 p-4 space-y-3",
    permissionsTitle: "text-sm font-semibold text-white text-right",
    permissionsHint: "text-xs text-white/50 text-right",
    permissionsRow:
      "flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2",
    permissionsLabel: "text-sm text-white text-right flex-1",
    gateBox: "rounded-xl border border-amber-400/35 bg-black/50 p-5 sm:p-6 space-y-4 text-right",
    gateText: "text-sm text-white/85 leading-relaxed",
    gateSecondary:
      "rounded border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10",
    guardianBox: "rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-right space-y-3",
    guardianText: "text-sm text-amber-100",
    guardianBtn:
      "w-full rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50 text-right text-white",
  };
}
