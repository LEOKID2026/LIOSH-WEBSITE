/** Classic theme — solo game entry / finish / pre-play screens (not active gameplay). */

export const SOLO_SHELL_CLASSIC = Object.freeze({
  shell:
    "flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-gradient-to-b from-[#050816] via-[#0b1020] to-[#050816] text-white",
  header:
    "flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4",
  navLink:
    "min-h-[44px] rounded-lg px-3 py-2 text-sm font-bold text-gray-300 transition hover:bg-white/5 hover:text-white",
  headerTitle:
    "min-w-0 max-w-[46%] truncate text-center text-lg font-extrabold leading-none sm:text-xl",
  playHeaderTitle:
    "min-w-0 max-w-[46%] truncate text-center text-lg font-extrabold leading-none text-white sm:text-xl",

  entryTitle: "text-2xl font-extrabold text-white sm:text-3xl",
  entryBlurb: "text-sm text-gray-300 sm:text-base",
  orientHint:
    "rounded-xl border border-sky-400/30 bg-sky-950/40 px-3 py-2 text-sm text-sky-100",
  diffLabel: "text-sm font-bold text-yellow-200",
  footerLink:
    "text-sm text-gray-400 underline-offset-2 transition hover:text-gray-200 hover:underline",
  errorBox:
    "rounded-lg bg-rose-950/60 px-3 py-2 text-sm text-rose-200",
  navHomeBtn:
    "inline-flex justify-center items-center rounded-xl bg-yellow-400 px-5 py-3 text-base font-bold text-black shadow-md transition hover:bg-yellow-300",

  finishCard:
    "rounded-2xl border border-white/10 bg-gray-900/90 p-3 shadow-xl sm:p-5 landscape:max-h-[min(78dvh,100%)] landscape:overflow-hidden landscape:p-3",
  finishTitle: "text-xl font-extrabold text-yellow-300 sm:text-2xl landscape:text-lg",
  finishBody: "mt-3 space-y-1.5 text-sm text-gray-100 sm:mt-4 sm:space-y-2 sm:text-base landscape:mt-2 landscape:space-y-1 landscape:text-sm",
  finishLabel: "text-gray-400",
  finishValue: "font-bold",
  finishCoins:
    "flex items-center justify-center gap-2 text-base font-extrabold text-amber-300 sm:text-lg landscape:text-sm",
  finishMuted: "text-xs text-gray-400 sm:text-sm landscape:text-[11px]",
  finishBalance: "font-bold text-amber-200",

  settlingOverlay:
    "fixed inset-0 z-[400] flex flex-col items-center justify-center bg-black/75 px-6 text-center",
  settlingTitle: "text-lg font-bold text-white",
  settlingSub: "mt-2 text-sm text-gray-300",
  settlingSpinner:
    "mb-4 h-10 w-10 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent",

  preGameWrap:
    "relative isolate flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-900 text-white select-none",
  preGameTitle: "text-sm font-extrabold text-yellow-300 sm:text-base",
  preGameSub: "text-[10px] text-gray-400 sm:text-[11px]",
  preGameImageBorderDefault: "border-white/20 hover:border-white/45",
  preGameImageBorderSelected:
    "border-yellow-400 shadow-md shadow-yellow-400/30 ring-2 ring-yellow-400/60",
  preGameStartBtn:
    "min-h-[40px] w-full rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-black shadow-md sm:min-h-[44px] sm:text-base",
  preGameErrorTitle: "text-base font-extrabold text-rose-200 sm:text-lg",
  preGameErrorSub: "text-sm text-gray-300",
  preGameLoading: "text-sm font-semibold text-yellow-200",

  introTitle: "text-lg font-extrabold text-yellow-300 sm:text-xl",
  introLines: "space-y-1 text-sm text-gray-200",
  introStartBtn:
    "min-h-[48px] rounded-xl bg-yellow-400 px-8 py-3 text-base font-bold text-black shadow-md",
});
