/** Bright theme — solo game entry / finish / pre-play screens (not active gameplay). */

export const SOLO_SHELL_BRIGHT = Object.freeze({
  shell: "flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden text-slate-800",
  header:
    "flex shrink-0 items-center justify-between gap-2 border-b border-sky-200/80 bg-white/50 px-3 py-2 backdrop-blur-sm sm:px-4",
  navLink:
    "min-h-[44px] rounded-lg px-3 py-2 text-sm font-bold text-sky-800 transition hover:bg-sky-50 hover:text-sky-900",
  headerTitle:
    "min-w-0 max-w-[46%] truncate text-center text-lg font-extrabold leading-none text-slate-900 sm:text-xl",
  playHeaderTitle:
    "min-w-0 max-w-[46%] truncate text-center text-lg font-extrabold leading-none text-white sm:text-xl",

  entryTitle: "text-2xl font-extrabold text-slate-900 sm:text-3xl",
  entryBlurb: "text-sm text-slate-600 sm:text-base",
  orientHint:
    "rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900",
  diffLabel: "text-sm font-bold text-amber-800",
  footerLink:
    "text-sm text-slate-500 underline-offset-2 transition hover:text-sky-700 hover:underline",
  errorBox:
    "rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800",
  navHomeBtn:
    "inline-flex justify-center items-center rounded-xl bg-yellow-400 px-5 py-3 text-base font-bold text-slate-900 shadow-md transition hover:bg-yellow-500",

  finishCard:
    "rounded-2xl border border-sky-200 bg-white p-3 shadow-xl shadow-sky-100/60 sm:p-5 landscape:max-h-[min(78dvh,100%)] landscape:overflow-hidden landscape:p-3",
  finishTitle: "text-xl font-extrabold text-amber-700 sm:text-2xl landscape:text-lg",
  finishBody: "mt-3 space-y-1.5 text-sm text-slate-800 sm:mt-4 sm:space-y-2 sm:text-base landscape:mt-2 landscape:space-y-1 landscape:text-sm",
  finishLabel: "text-slate-500",
  finishValue: "font-bold text-slate-900",
  finishCoins: "flex items-center justify-center gap-2 text-base font-extrabold text-amber-700 sm:text-lg landscape:text-sm",
  finishMuted: "text-xs text-slate-500 sm:text-sm landscape:text-[11px]",
  finishBalance: "font-bold text-amber-800",

  settlingOverlay:
    "fixed inset-0 z-[400] flex flex-col items-center justify-center bg-sky-100/92 px-6 text-center backdrop-blur-sm",
  settlingTitle: "text-lg font-bold text-slate-900",
  settlingSub: "mt-2 text-sm text-slate-600",
  settlingSpinner: "mb-4 h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent",

  preGameWrap:
    "relative isolate flex h-full min-h-0 flex-1 flex-col overflow-hidden text-slate-800 select-none",
  preGameTitle: "text-sm font-extrabold text-amber-800 sm:text-base",
  preGameSub: "text-[10px] text-slate-500 sm:text-[11px]",
  preGameImageBorderDefault: "border-sky-200 hover:border-sky-400",
  preGameImageBorderSelected:
    "border-amber-400 shadow-md shadow-amber-200/60 ring-2 ring-amber-300/70",
  preGameStartBtn:
    "min-h-[40px] w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-sky-700 sm:min-h-[44px] sm:text-base",
  preGameErrorTitle: "text-base font-extrabold text-rose-700 sm:text-lg",
  preGameErrorSub: "text-sm text-slate-600",
  preGameLoading: "text-sm font-semibold text-amber-700",

  introTitle: "text-lg font-extrabold text-amber-800 sm:text-xl",
  introLines: "space-y-1 text-sm text-slate-700",
  introStartBtn:
    "min-h-[48px] rounded-xl bg-sky-600 px-8 py-3 text-base font-bold text-white shadow-md transition hover:bg-sky-700",
});
