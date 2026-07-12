/**
 * Bright learning UI classes — math-master pilot only.
 */

import {
  STUDENT_BRIGHT_PAGE_BACKGROUND,
  STUDENT_BRIGHT_MASTER_SHELL_LAYOUT,
} from "./student-bright-page-background.client.js";

/** @deprecated use STUDENT_BRIGHT_PAGE_BACKGROUND */
export const MATH_MASTER_BRIGHT_PAGE_BACKGROUND = STUDENT_BRIGHT_PAGE_BACKGROUND;

/** @deprecated use STUDENT_BRIGHT_MASTER_SHELL_LAYOUT */
export const MATH_MASTER_BRIGHT_SHELL_LAYOUT = STUDENT_BRIGHT_MASTER_SHELL_LAYOUT;

/** Soft teal/mint panel fill — aligned with scratchpad + page background. */
const LEARNING_MODAL_BRIGHT_FILL =
  "bg-[radial-gradient(circle_at_88%_0%,rgba(14,165,233,0.22),transparent_38%),radial-gradient(circle_at_12%_100%,rgba(45,212,191,0.18),transparent_42%),linear-gradient(180deg,#C5E8FF_0%,#D8F2FF_52%,#d6fff6_100%)]";

/** Header/footer chrome on bright learning modals. */
const LEARNING_MODAL_BRIGHT_CHROME =
  "bg-[linear-gradient(180deg,rgba(214,255,246,0.96),rgba(196,244,255,0.92))]";

export const learningModalOverlay =
  "fixed inset-0 z-[200] bg-slate-900/45 flex items-center justify-center px-4";

export const learningModalPanel = [
  LEARNING_MODAL_BRIGHT_FILL,
  "border-2 border-sky-200/90 rounded-2xl w-[min(100vw-1rem,430px)] h-[88vh] max-h-[800px]",
  "shadow-xl shadow-sky-200/40 ring-1 ring-sky-200/40 flex flex-col overflow-hidden",
].join(" ");

export const learningModalHeader = [
  "flex items-center justify-between gap-3 p-4 pb-3 flex-shrink-0",
  "border-b border-sky-200/80",
  LEARNING_MODAL_BRIGHT_CHROME,
].join(" ");

export const learningModalCloseBtn =
  "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sky-800 hover:text-sky-950 hover:bg-white/90 bg-white/80 border border-sky-300/80 transition-colors text-xl leading-none cursor-pointer";

export const learningModalTitle =
  "text-lg font-bold text-sky-950 tracking-tight text-center flex-1 min-w-0";

export const learningModalFooter = [
  "p-4 pt-3 flex flex-col gap-2.5 flex-shrink-0",
  "border-t border-sky-200/80",
  LEARNING_MODAL_BRIGHT_CHROME,
].join(" ");

export const learningStepNavRow = "flex gap-2 sm:gap-3 justify-center items-center flex-wrap";

export const learningStepNavBtn =
  "inline-flex items-center justify-center min-h-11 min-w-[5.25rem] px-4 rounded-xl text-sm font-bold transition-colors bg-sky-600 text-white hover:bg-sky-700 active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

export const learningStepNavBtnPlay =
  "inline-flex items-center justify-center min-h-11 min-w-[5.25rem] px-4 rounded-xl text-sm font-bold transition-colors bg-cyan-600 text-white hover:bg-cyan-700 active:scale-[0.98] cursor-pointer";

export const learningStepCounter = "text-center text-xs text-slate-600 font-medium tabular-nums";

export const learningModalScrollBody =
  "flex-1 min-h-0 overflow-y-auto px-4 pb-2 bg-transparent";

/** בלון התרגיל בחלון צעד-צעד — משתלב ברקע המודל הבהיר. */
export const learningQuestionBox =
  "rounded-xl border-2 border-sky-300/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(196,244,255,0.5))] shadow-sm px-4 py-3.5";

export const learningQuestionText =
  "text-base sm:text-lg text-slate-900 font-bold break-words overflow-wrap-anywhere max-w-full leading-snug antialiased tabular-nums";

export const learningStepSection = "mb-4 space-y-2 text-slate-800";

export const learningExplTitle = "font-semibold text-base text-slate-900 mb-2.5 tracking-tight";

export const learningExplBody = "text-base leading-7 text-slate-700";

export const learningExplBodyGeometry = "text-base leading-7 text-slate-700";

export const learningPrimaryCloseBtn =
  "inline-flex items-center justify-center min-h-11 px-6 rounded-xl text-sm font-bold transition-colors bg-sky-600 text-white hover:bg-sky-700 active:scale-[0.98] cursor-pointer disabled:opacity-40";

export const learningHintTriggerBtn =
  "inline-flex items-center justify-center min-h-11 px-4 rounded-xl text-sm font-bold text-white transition-colors active:scale-[0.98] bg-amber-500 hover:bg-amber-600 cursor-pointer disabled:opacity-40";

export const learningExplainOpenBtn =
  "inline-flex items-center justify-center min-h-11 px-4 rounded-xl text-sm font-bold text-white transition-colors active:scale-[0.98] bg-sky-600 hover:bg-sky-700 cursor-pointer disabled:opacity-40";

/** Shell / HUD / controls — math-master only */

/** Top + bottom HUD strip surface (bright only) — soft mint/turquoise, distinct from page bg. */
const BRIGHT_HUD_SURFACE =
  "bg-[linear-gradient(180deg,rgba(214,255,246,0.96),rgba(196,244,255,0.92))] border border-[rgba(45,212,191,0.35)]";

export const MATH_BRIGHT = Object.freeze({
  shell: `${STUDENT_BRIGHT_MASTER_SHELL_LAYOUT}`,

  hudCell: `${BRIGHT_HUD_SURFACE} rounded-lg py-1.5 px-0.5 md:py-2 md:px-1 lg:px-1.5 text-center flex flex-col items-stretch justify-start min-h-[50px] md:min-h-[58px] lg:min-h-[62px] shadow-sm`,
  hudLabel:
    "text-[9px] md:text-[12px] lg:text-sm text-slate-600 font-semibold leading-tight",
  hudValueScore: "text-sm md:text-lg lg:text-xl font-extrabold text-sky-700 leading-tight tabular-nums",
  hudValueStreak: "text-sm md:text-lg lg:text-xl font-extrabold text-orange-600 leading-tight tabular-nums",
  hudValueStars: "text-sm md:text-lg lg:text-xl font-extrabold text-amber-600 leading-tight tabular-nums",
  hudValueLevel: "text-sm md:text-lg lg:text-xl font-extrabold text-violet-700 leading-tight tabular-nums",
  hudValueCorrect: "text-sm md:text-lg lg:text-xl font-extrabold text-emerald-700 leading-tight tabular-nums",
  hudValueLives: "text-sm md:text-lg lg:text-xl font-extrabold text-rose-600 leading-tight tabular-nums",
  hudTimerNormal: `${BRIGHT_HUD_SURFACE} rounded-lg shadow-sm`,
  hudTimerUrgent: "bg-rose-50 border-2 border-rose-400 rounded-lg shadow-sm animate-pulse",
  hudTimerValueNormal: "text-sm md:text-lg lg:text-xl font-black text-slate-700 leading-tight tabular-nums",
  hudTimerValueActive: "text-sm md:text-lg lg:text-xl font-black text-amber-600 leading-tight tabular-nums",
  hudTimerValueUrgent: "text-sm md:text-lg lg:text-xl font-black text-rose-600 leading-tight tabular-nums",
  hudAvatarBtn: `${BRIGHT_HUD_SURFACE} rounded-lg py-1.5 px-0.5 md:py-2 md:px-1 lg:px-1.5 text-center flex flex-col items-stretch justify-start min-h-[50px] md:min-h-[58px] lg:min-h-[62px] shadow-sm hover:border-[rgba(45,212,191,0.55)] hover:bg-[linear-gradient(180deg,rgba(208,252,243,0.98),rgba(188,240,255,0.96))] transition-all cursor-pointer`,

  pageTitle: "text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900",
  pageSub: "text-slate-700 text-xs md:text-sm font-medium",

  navBtn:
    "min-w-[100px] px-3 py-1 rounded-lg text-sm font-bold bg-white border border-sky-300 hover:bg-sky-50 hover:border-sky-400 text-sky-800 shadow-sm",
  backBtn:
    "min-w-[60px] px-3 py-1 rounded-lg text-sm font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 shadow-sm",

  modeTabActive:
    "h-8 md:h-10 lg:h-11 px-3 md:px-4 lg:px-5 rounded-lg text-xs md:text-sm lg:text-base font-bold transition-all flex-shrink-0 bg-sky-600 text-white border border-sky-700 shadow-sm",
  modeTabInactive:
    "h-8 md:h-10 lg:h-11 px-3 md:px-4 lg:px-5 rounded-lg text-xs md:text-sm lg:text-base font-bold transition-all flex-shrink-0 bg-white text-slate-700 border border-slate-300 hover:border-sky-400 hover:bg-sky-50 shadow-sm",

  coinBadgeDesktop:
    "hidden md:inline-flex items-center justify-center gap-1.5 md:gap-2 shrink-0 rounded-lg border border-amber-300 bg-amber-50 md:h-10 lg:h-11 md:px-4 lg:px-5 md:text-sm lg:text-base font-bold tabular-nums shadow-sm",
  coinBadgeMobile:
    "md:hidden inline-flex items-center justify-center gap-1.5 shrink-0 rounded-lg border border-amber-300/70 bg-amber-50/90 px-3 py-2 text-xs font-bold tabular-nums shadow-sm",
  coinBadgeLabel: "text-amber-900",
  coinBadgeValue: "text-amber-800 font-extrabold",

  preGameTile: `${BRIGHT_HUD_SURFACE} rounded-lg md:rounded-xl px-1 py-2 md:px-2 md:py-3 min-h-[4.5rem] md:min-h-[5.25rem] lg:min-h-[5.75rem] flex flex-col items-stretch justify-start gap-1 md:gap-1.5 min-w-0 shadow-sm`,
  preGameTileLabel:
    "text-[10px] md:text-[13px] lg:text-sm text-slate-600 font-semibold text-center leading-tight max-w-full line-clamp-2",
  preGameTileValueEmerald: "text-base md:text-xl lg:text-2xl font-extrabold text-emerald-700 tabular-nums leading-tight",
  preGameTileValueAmber: "text-base md:text-xl lg:text-2xl font-extrabold text-orange-600 tabular-nums leading-tight",
  preGameTileValueBlue: "text-base md:text-xl lg:text-2xl font-extrabold text-sky-700 tabular-nums leading-tight",
  preGamePlayerBadge:
    "h-10 md:h-11 shrink-0 w-[3.5rem] md:w-[8.5rem] lg:w-[9.25rem] px-1.5 md:px-3 lg:px-3.5 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs md:text-sm font-bold box-border flex items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap select-none pointer-events-none min-w-0 shadow-sm",
  preGameGearBtn:
    "h-10 w-10 md:h-11 md:w-11 shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 border border-white/20 text-white text-sm md:text-base font-bold flex items-center justify-center box-border",
  selectControl:
    "h-10 md:h-11 shrink-0 min-w-0 rounded-lg bg-white border border-slate-200 text-slate-900 text-xs md:text-sm font-bold px-2 box-border overflow-hidden text-ellipsis whitespace-nowrap shadow-sm",

  btnPrimary:
    "h-9 md:h-10 px-4 md:px-5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed font-bold text-xs md:text-sm text-white shadow-sm",
  btnAction:
    "h-9 md:h-10 px-3 md:px-4 rounded-lg font-bold text-xs md:text-sm text-white shadow-sm border border-transparent",
  btnActionHelp:
    "px-4 py-2 md:px-5 md:py-2.5 rounded-lg font-bold text-xs md:text-sm text-white shadow-sm border border-transparent",
  btnActionBlue: "bg-blue-600 hover:bg-blue-700 border-blue-700",
  btnActionOrange: "bg-orange-500 hover:bg-orange-600 border-orange-600",
  btnActionCyan: "bg-cyan-600 hover:bg-cyan-700 border-cyan-700",
  btnActionPurple: "bg-violet-600 hover:bg-violet-700 border-violet-700",
  btnActionPink: "bg-rose-500 hover:bg-rose-600 border-rose-600",
  btnActionTeal:
    "bg-teal-600 hover:bg-teal-700 text-white border-2 border-teal-700 shadow-md",
  btnActionTealOutline:
    "bg-white text-teal-900 border-2 border-teal-500 hover:bg-teal-50 shadow-sm font-extrabold",
  btnOpenSmall: "h-7 md:h-8 w-full max-w-[3.5rem] md:max-w-[4rem] px-1.5 md:px-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-[11px] md:text-sm lg:text-base font-bold",

  scratchpadOpenBtn:
    "inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white border border-orange-700 shadow-sm",
  btnHint:
    "inline-flex items-center justify-center px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm",
  btnStepByStep:
    "inline-flex items-center justify-center min-h-11 px-4 md:px-5 rounded-lg text-xs md:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm",
  btnPrevExercise:
    "inline-flex items-center justify-center min-h-11 px-4 md:px-5 rounded-lg text-xs md:text-sm font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm",
  btnShowTable:
    "inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all",
  btnStop:
    "inline-flex items-center justify-center min-h-11 px-4 md:px-5 rounded-lg text-xs md:text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm",
  adSlot:
    "w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-4xl mx-auto shrink-0 h-10 md:h-12 min-h-[2.5rem] rounded-lg border border-dashed border-teal-300/45 bg-teal-50/25 pointer-events-none flex items-center justify-center",
  adSlotLabel: "text-xs md:text-sm font-medium text-teal-700/55 select-none",
  btnSoundOn:
    "h-7 w-7 rounded-lg border border-emerald-600 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold flex items-center justify-center transition-all flex-shrink-0",
  btnSoundOff:
    "h-7 w-7 rounded-lg border border-rose-600 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold flex items-center justify-center transition-all flex-shrink-0",

  gameCardSkin:
    "rounded-xl border border-sky-300 bg-white/95 shadow-md",
  questionSurfaceSkin:
    "bg-gradient-to-b from-white via-sky-50/40 to-sky-50/60",

  questionLead:
    "text-2xl text-center text-slate-800 font-semibold mb-2 break-words overflow-wrap-anywhere max-w-full px-2",
  questionBody: "text-4xl text-center text-slate-900 font-extrabold max-w-full px-2",
  questionFormula:
    "text-center text-slate-900 font-bold font-mono max-w-full px-2 py-1 leading-snug",
  questionPre:
    "text-3xl text-center text-slate-900 font-extrabold font-mono whitespace-pre",

  answerWrap:
    "w-full mb-3 p-4 max-[420px]:p-1.5 max-[420px]:mb-1.5 rounded-xl bg-sky-100 border-2 border-sky-400 shadow-md shadow-sky-200/70 ring-1 ring-sky-300/60",
  answerMcqGridCompact: "max-[420px]:gap-2 max-[420px]:mb-2",
  answerMcqBtnCompactXl: "max-[420px]:px-3 max-[420px]:py-3 max-[420px]:text-lg",
  answerMcqBtnCompactLg: "max-[420px]:px-3 max-[420px]:py-3 max-[420px]:text-base",

  choiceDefault:
    "bg-[#2878A5] border-2 border-[#1E6289] text-white font-bold shadow-sm hover:bg-[#226B94] hover:border-[#1E6289]",
  choiceSelected:
    "bg-[#7047D7] border-2 border-[#5B21A8] text-white font-bold shadow-sm",
  choiceCorrect: "bg-emerald-100 border-2 border-emerald-500 text-emerald-900 shadow-md",
  choiceWrong: "bg-rose-100 border-2 border-rose-500 text-rose-900 shadow-md",

  checkBtn:
    "px-6 py-3 rounded-lg font-bold text-lg max-[420px]:px-4 max-[420px]:py-2 max-[420px]:text-base bg-sky-600 hover:bg-sky-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
  checkBtnNext:
    "px-6 py-3 rounded-lg font-bold text-lg max-[420px]:px-4 max-[420px]:py-2 max-[420px]:text-base bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",

  vkKey:
    "min-h-[48px] rounded-xl border-2 border-sky-400 bg-white text-slate-900 text-xl font-extrabold tabular-nums shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed hover:border-sky-500 hover:bg-sky-50 transition-transform",
  vkKeyCompact:
    "min-h-[46px] h-[46px] max-[420px]:min-h-[42px] max-[420px]:h-[42px] rounded-lg border-2 border-sky-400 bg-white text-slate-900 text-lg max-[420px]:text-base font-bold tabular-nums leading-none active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed hover:border-sky-500 hover:bg-sky-50 transition-transform shadow-sm",
  vkClearKeyCompact:
    "min-h-[46px] h-[46px] max-[420px]:min-h-[42px] max-[420px]:h-[42px] rounded-lg border-2 border-red-500 bg-red-600 text-white text-sm max-[420px]:text-sm font-bold leading-none active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-500 transition-transform shadow-sm",
  vkSubmitGreen:
    "col-span-3 min-h-[46px] h-[46px] max-[420px]:min-h-[42px] max-[420px]:h-[42px] rounded-lg border-2 border-emerald-600 bg-emerald-500 text-white text-base max-[420px]:text-sm font-bold leading-none active:scale-[0.98] disabled:opacity-40 hover:bg-emerald-600 transition-transform shadow-sm",
  vkSubmitBlue:
    "col-span-3 min-h-[46px] h-[46px] max-[420px]:min-h-[42px] max-[420px]:h-[42px] rounded-lg border-2 border-cyan-600 bg-cyan-500 text-white text-base max-[420px]:text-sm font-bold leading-none active:scale-[0.98] disabled:opacity-40 hover:bg-cyan-600 transition-transform shadow-sm",
  vkPad:
    "mt-2 max-[420px]:mt-0.5 w-full max-w-[340px] max-[420px]:max-w-[300px] mx-auto p-3 max-[420px]:p-1.5 rounded-xl bg-white/95 border-2 border-sky-400 shadow-sm",

  inputDesktop:
    "w-full px-4 py-4 max-[420px]:px-3 max-[420px]:py-2.5 rounded-xl bg-white border-2 border-sky-500 text-slate-900 text-2xl max-[420px]:text-xl font-bold text-center leading-none tabular-nums shadow-inner shadow-sky-100 ring-2 ring-sky-200/80 disabled:opacity-50 disabled:bg-slate-100",
  inputMobile:
    "w-full h-11 max-h-11 max-[420px]:h-9 max-[420px]:max-h-9 px-3 max-[420px]:px-2 py-0 rounded-xl bg-white border-2 border-sky-500 text-slate-900 text-lg max-[420px]:text-base font-semibold text-center leading-none tabular-nums placeholder:text-slate-400 placeholder:font-normal disabled:opacity-50 disabled:bg-slate-100 [appearance:textfield] overflow-hidden text-ellipsis whitespace-nowrap shadow-inner shadow-sky-100 ring-2 ring-sky-200/80",

  explVertical:
    "mb-3 rounded-xl bg-sky-50 border-2 border-sky-300 shadow-sm px-4 py-3 text-center font-mono text-base font-semibold leading-relaxed whitespace-pre text-slate-900",

  floatBtn:
    "absolute z-10 inline-flex items-center justify-center h-8 min-h-8 px-3 rounded-lg text-xs font-bold leading-none shadow-lg transition-all text-white",
  /** Desktop: top corners. Hidden on mobile — use questionMobileActionDock instead. */
  floatBtnCornerLeft: "top-2 left-2",
  floatBtnStack:
    "absolute top-2 right-2 z-10 flex flex-col gap-1.5 pointer-events-auto min-w-[5.5rem]",
  floatBtnHelper:
    "inline-flex items-center justify-center h-8 min-h-8 px-3 rounded-lg text-xs font-bold leading-none shadow-lg transition-all text-white text-center whitespace-nowrap",
  /** Shared mobile question action row — equal height + fixed side columns (no shift on label change). */
  questionActionBtn:
    "inline-flex items-center justify-center h-8 min-h-8 px-2 rounded-lg text-xs font-bold leading-none shadow-lg transition-all whitespace-nowrap text-white w-full max-w-full",
  questionMobileActionDock:
    "md:hidden absolute bottom-2 inset-x-2 z-10 grid grid-cols-[5.75rem_minmax(0,1fr)_5.75rem] items-center gap-x-1 pointer-events-none",
  questionMobileActionDockWideSecondary:
    "md:hidden absolute bottom-2 inset-x-2 z-10 grid grid-cols-[5.75rem_minmax(0,1fr)_auto] items-center gap-x-1 pointer-events-none",
  floatBtnPurple: "bg-violet-600 hover:bg-violet-700 text-white",
  floatBtnScratchpad: "bg-orange-600 hover:bg-orange-700 text-white",
  floatBtnTeal: "bg-teal-600 hover:bg-teal-700 text-white",
  floatBtnTable: "bg-blue-600 hover:bg-blue-700 text-white",
  floatBtnBookColors: "bg-teal-600 hover:bg-teal-700 text-white",
  floatBtnBook: "bg-teal-600 hover:bg-teal-700 text-white top-2 right-2",
  floatBtnTheory: "bg-violet-600 hover:bg-violet-700 text-white top-2 left-2",

  feedbackOk: "bg-emerald-100 border-2 border-emerald-400 text-emerald-900",
  feedbackBad: "bg-rose-100 border-2 border-rose-400 text-rose-900",
  feedbackOkAnim: "bg-emerald-200 border-2 border-emerald-500 text-emerald-900 scale-110 shadow-lg shadow-emerald-300/50",
  feedbackBadAnim: "bg-rose-200 border-2 border-rose-500 text-rose-900 scale-105 shadow-lg shadow-rose-300/50",
  hintBox: "bg-blue-50 border border-blue-300 rounded-lg p-3 text-right shadow-sm",
  hintTitle: "text-xs font-bold text-blue-800 mb-1.5",
  hintBody: "text-sm text-blue-900 leading-relaxed",
  errorBox: "bg-rose-50 border border-rose-300 rounded-lg p-3 text-right shadow-sm",
  errorTitle: "text-xs font-bold text-rose-800 mb-1.5",
  errorBody: "text-sm text-rose-900 leading-relaxed",

  answerActionsBar:
    "mt-0 flex gap-2 justify-center flex-wrap w-full max-w-full",

  mutedHint: "text-xs text-slate-600 text-center mb-1 font-medium",
});

export const LEARNING_MASTER_BRIGHT = MATH_BRIGHT;
