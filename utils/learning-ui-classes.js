/**
 * Shared Tailwind class fragments for learning modals (Math / Science / Geometry).
 * Keeps explanation UI visually aligned without changing layout structure.
 */

export const learningModalOverlay =
  "fixed inset-0 z-[200] bg-black/70 flex items-center justify-center px-4";

export const learningModalPanel =
  "bg-gradient-to-br from-emerald-950 to-emerald-900 border border-emerald-400/60 rounded-2xl w-[min(100vw-1rem,430px)] h-[88vh] max-h-[800px] shadow-2xl flex flex-col";

export const learningModalHeader =
  "flex items-center justify-between gap-3 p-4 pb-3 flex-shrink-0 border-b border-emerald-400/10";

export const learningModalCloseBtn =
  "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-emerald-200 hover:text-white hover:bg-emerald-800/45 transition-colors text-xl leading-none cursor-pointer disabled:cursor-not-allowed";

export const learningModalTitle =
  "text-lg font-bold text-emerald-100 tracking-tight text-center flex-1 min-w-0";

export const learningModalFooter =
  "p-4 pt-3 flex flex-col gap-2.5 flex-shrink-0 border-t border-emerald-400/20";

export const learningStepNavRow = "flex gap-2 sm:gap-3 justify-center items-center flex-wrap";

export const learningStepNavBtn =
  "inline-flex items-center justify-center min-h-10 min-w-[5.25rem] px-4 rounded-lg text-sm font-bold transition-colors bg-emerald-600/80 hover:bg-emerald-600 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

export const learningStepNavBtnPlay =
  "inline-flex items-center justify-center min-h-10 min-w-[5.25rem] px-4 rounded-lg text-sm font-bold transition-colors bg-emerald-600/80 hover:bg-emerald-600 active:scale-[0.98] cursor-pointer";

export const learningStepCounter =
  "text-center text-xs text-emerald-300/95 tabular-nums";

export const learningQuestionBox =
  "rounded-lg bg-emerald-900/50 border border-emerald-500/15 px-3 py-2.5";

export const learningQuestionText =
  "text-sm text-emerald-100 font-semibold break-words overflow-wrap-anywhere max-w-full leading-snug";

export const learningExplTitle =
  "font-semibold text-base text-emerald-50 mb-2.5 tracking-tight";

export const learningExplBody =
  "text-base leading-7 text-emerald-50/95";

export const learningStepSection = "mb-4 text-emerald-50 space-y-2";

export const learningModalScrollBody = "flex-1 min-h-0 overflow-y-auto px-4 pb-2";

/** Geometry step text — same size as math explanations, modest line spacing. */
export const learningExplBodyGeometry =
  "text-base leading-7 text-emerald-50/95";

export const learningPrimaryCloseBtn =
  "inline-flex items-center justify-center min-h-10 px-6 rounded-lg text-sm font-bold transition-colors bg-emerald-600/80 hover:bg-emerald-600 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed";

/** Hint / “הסבר מלא” triggers on game screens */
export const learningHintTriggerBtn =
  "inline-flex items-center justify-center min-h-10 px-4 rounded-lg text-sm font-bold text-white transition-colors active:scale-[0.98] bg-blue-500/80 hover:bg-blue-500 cursor-pointer disabled:cursor-not-allowed";

export const learningExplainOpenBtn =
  "inline-flex items-center justify-center min-h-10 px-4 rounded-lg text-sm font-bold text-white transition-colors active:scale-[0.98] bg-emerald-500/80 hover:bg-emerald-500 cursor-pointer disabled:cursor-not-allowed";
