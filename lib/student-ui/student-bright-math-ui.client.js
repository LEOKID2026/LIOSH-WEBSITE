/**
 * Bright learning UI classes — math-master pilot only.
 */

export const learningModalOverlay =
  "fixed inset-0 z-[200] bg-slate-900/50 flex items-center justify-center px-4";

export const learningModalPanel =
  "bg-white border-2 border-sky-200 rounded-2xl w-[min(100vw-1rem,430px)] h-[88vh] max-h-[800px] shadow-xl shadow-slate-300/50 flex flex-col";

export const learningModalHeader =
  "flex items-center justify-between gap-3 p-4 pb-3 flex-shrink-0 border-b border-slate-200";

export const learningModalCloseBtn =
  "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors text-xl leading-none cursor-pointer";

export const learningModalTitle =
  "text-lg font-bold text-slate-900 tracking-tight text-center flex-1 min-w-0";

export const learningModalFooter =
  "p-4 pt-3 flex flex-col gap-2.5 flex-shrink-0 border-t border-slate-200";

export const learningStepNavRow = "flex gap-2 sm:gap-3 justify-center items-center flex-wrap";

export const learningStepNavBtn =
  "inline-flex items-center justify-center min-h-11 min-w-[5.25rem] px-4 rounded-xl text-sm font-bold transition-colors bg-sky-600 text-white hover:bg-sky-700 active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

export const learningStepNavBtnPlay =
  "inline-flex items-center justify-center min-h-11 min-w-[5.25rem] px-4 rounded-xl text-sm font-bold transition-colors bg-cyan-600 text-white hover:bg-cyan-700 active:scale-[0.98] cursor-pointer";

export const learningStepCounter = "text-center text-xs text-slate-600 font-medium tabular-nums";

export const learningModalScrollBody = "flex-1 min-h-0 overflow-y-auto px-4 pb-2";

/** בלון התרגיל בחלון צעד-צעד — כמו answerWrap במסך התרגול. */
export const learningQuestionBox =
  "rounded-xl bg-sky-50 border-2 border-sky-300 shadow-sm px-4 py-3.5";

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
export const MATH_BRIGHT = Object.freeze({
  shell:
    "flex flex-col h-dvh max-h-dvh min-h-0 overflow-hidden bg-gradient-to-b from-[#EAF6FF] via-[#F0F9FF] to-[#F8FAFC]",

  hudCell:
    "bg-white border border-slate-200 rounded-lg py-1.5 px-0.5 md:py-2 md:px-1 lg:px-1.5 text-center flex flex-col items-stretch justify-start min-h-[50px] md:min-h-[58px] lg:min-h-[62px] shadow-sm",
  hudLabel:
    "text-[9px] md:text-[12px] lg:text-sm text-slate-600 font-semibold leading-tight",
  hudValueScore: "text-sm md:text-lg lg:text-xl font-extrabold text-sky-700 leading-tight tabular-nums",
  hudValueStreak: "text-sm md:text-lg lg:text-xl font-extrabold text-orange-600 leading-tight tabular-nums",
  hudValueStars: "text-sm md:text-lg lg:text-xl font-extrabold text-amber-600 leading-tight tabular-nums",
  hudValueLevel: "text-sm md:text-lg lg:text-xl font-extrabold text-violet-700 leading-tight tabular-nums",
  hudValueCorrect: "text-sm md:text-lg lg:text-xl font-extrabold text-emerald-700 leading-tight tabular-nums",
  hudValueLives: "text-sm md:text-lg lg:text-xl font-extrabold text-rose-600 leading-tight tabular-nums",
  hudTimerNormal: "bg-white border border-slate-200 rounded-lg shadow-sm",
  hudTimerUrgent: "bg-rose-50 border-2 border-rose-400 rounded-lg shadow-sm animate-pulse",
  hudTimerValueNormal: "text-sm md:text-lg lg:text-xl font-black text-slate-700 leading-tight tabular-nums",
  hudTimerValueActive: "text-sm md:text-lg lg:text-xl font-black text-amber-600 leading-tight tabular-nums",
  hudTimerValueUrgent: "text-sm md:text-lg lg:text-xl font-black text-rose-600 leading-tight tabular-nums",
  hudAvatarBtn:
    "bg-white border border-slate-200 rounded-lg py-1.5 px-0.5 md:py-2 md:px-1 lg:px-1.5 text-center flex flex-col items-stretch justify-start min-h-[50px] md:min-h-[58px] lg:min-h-[62px] shadow-sm hover:border-violet-300 hover:bg-violet-50 transition-all cursor-pointer",

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

  preGameTile:
    "bg-white border border-slate-200 rounded-lg md:rounded-xl px-1 py-2 md:px-2 md:py-3 min-h-[4.5rem] md:min-h-[5.25rem] lg:min-h-[5.75rem] flex flex-col items-stretch justify-start gap-1 md:gap-1.5 min-w-0 shadow-sm",
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
    "px-3 py-1.5 text-xs font-bold rounded-lg bg-violet-600 hover:bg-violet-700 text-white border border-violet-700 shadow-sm",
  btnHint:
    "inline-flex items-center justify-center px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm",
  btnStepByStep:
    "inline-flex items-center justify-center px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm",
  btnPrevExercise:
    "inline-flex items-center justify-center px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm",
  btnShowTable:
    "px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
  btnStop:
    "h-9 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 font-bold text-sm text-white shadow-sm",
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
    "w-full mb-3 p-4 md:p-5 rounded-xl bg-sky-100 border-2 border-sky-400 shadow-md shadow-sky-200/70 ring-1 ring-sky-300/60",

  choiceDefault:
    "bg-white border-2 border-slate-300 text-slate-900 hover:border-sky-500 hover:bg-sky-50 shadow-sm",
  choiceCorrect: "bg-emerald-100 border-2 border-emerald-500 text-emerald-900 shadow-md",
  choiceWrong: "bg-rose-100 border-2 border-rose-500 text-rose-900 shadow-md",

  checkBtn:
    "px-6 py-3 rounded-lg font-bold text-lg bg-sky-600 hover:bg-sky-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
  checkBtnNext:
    "px-6 py-3 rounded-lg font-bold text-lg bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",

  vkKey:
    "min-h-[48px] rounded-xl border-2 border-sky-400 bg-white text-slate-900 text-xl font-extrabold tabular-nums shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed hover:border-sky-500 hover:bg-sky-50 transition-transform",
  vkKeyCompact:
    "min-h-[44px] h-11 rounded-lg border-2 border-sky-400 bg-white text-slate-900 text-lg font-bold tabular-nums leading-none active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed hover:border-sky-500 hover:bg-sky-50 transition-transform shadow-sm",
  vkSubmitGreen:
    "col-span-3 min-h-[44px] h-11 rounded-lg border-2 border-emerald-600 bg-emerald-500 text-white text-base font-bold leading-none active:scale-[0.98] disabled:opacity-40 hover:bg-emerald-600 transition-transform shadow-sm",
  vkSubmitBlue:
    "col-span-3 min-h-[44px] h-11 rounded-lg border-2 border-cyan-600 bg-cyan-500 text-white text-base font-bold leading-none active:scale-[0.98] disabled:opacity-40 hover:bg-cyan-600 transition-transform shadow-sm",
  vkPad:
    "mt-2 w-full max-w-[320px] mx-auto p-3 rounded-xl bg-white/95 border-2 border-sky-400 shadow-sm",

  inputDesktop:
    "w-full px-4 py-5 rounded-xl bg-white border-2 border-sky-500 text-slate-900 text-3xl font-extrabold text-center leading-none tabular-nums shadow-inner shadow-sky-100 ring-2 ring-sky-200/80 disabled:opacity-50 disabled:bg-slate-100",
  inputMobile:
    "w-full h-12 max-h-12 px-3 py-0 rounded-xl bg-white border-2 border-sky-500 text-slate-900 text-xl font-bold text-center leading-none tabular-nums placeholder:text-slate-400 placeholder:font-normal disabled:opacity-50 disabled:bg-slate-100 [appearance:textfield] overflow-hidden text-ellipsis whitespace-nowrap shadow-inner shadow-sky-100 ring-2 ring-sky-200/80",

  explVertical:
    "mb-3 rounded-xl bg-sky-50 border-2 border-sky-300 shadow-sm px-4 py-3 text-center font-mono text-base font-semibold leading-relaxed whitespace-pre text-slate-900",

  floatBtn:
    "absolute z-10 px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg transition-all text-white",
  floatBtnPurple: "bg-violet-600 hover:bg-violet-700 text-white",
  floatBtnTeal: "bg-teal-600 hover:bg-teal-700 text-white",
  floatBtnBook: "bg-teal-600 hover:bg-teal-700 text-white top-2 right-2",

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
