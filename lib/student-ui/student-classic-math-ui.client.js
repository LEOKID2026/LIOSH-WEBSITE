/**
 * Classic (dark) math-master UI — mirrors MATH_BRIGHT keys.
 */

export const MATH_CLASSIC = Object.freeze({
  shell:
    "flex flex-col h-dvh max-h-dvh min-h-0 overflow-hidden bg-gradient-to-b from-[#0a0f1d] to-[#141928]",

  hudCell:
    "bg-black/30 border border-white/10 rounded-lg py-1.5 px-0.5 md:py-2 md:px-1 lg:px-1.5 text-center flex flex-col items-stretch justify-start min-h-[50px] md:min-h-[58px] lg:min-h-[62px]",
  hudLabel:
    "text-[9px] md:text-[12px] lg:text-sm text-white/78 md:text-white/85 lg:text-white/90 leading-tight",
  hudValueScore:
    "text-sm md:text-lg lg:text-xl font-bold text-emerald-300 leading-tight tabular-nums",
  hudValueStreak:
    "text-sm md:text-lg lg:text-xl font-bold text-amber-300 leading-tight tabular-nums",
  hudValueStars:
    "text-sm md:text-lg lg:text-xl font-bold text-yellow-300 leading-tight tabular-nums",
  hudValueLevel:
    "text-sm md:text-lg lg:text-xl font-bold text-purple-300 leading-tight tabular-nums",
  hudValueCorrect:
    "text-sm md:text-lg lg:text-xl font-bold text-green-300 leading-tight tabular-nums",
  hudValueLives:
    "text-sm md:text-lg lg:text-xl font-bold text-rose-300 leading-tight tabular-nums",
  hudTimerNormal: "bg-black/30 border border-white/10 rounded-lg",
  hudTimerUrgent: "bg-red-500/30 border-2 border-red-400 rounded-lg animate-pulse",
  hudTimerValueNormal:
    "text-sm md:text-lg lg:text-xl font-black text-white/78 md:text-white/85 lg:text-white/90 leading-tight tabular-nums",
  hudTimerValueActive:
    "text-sm md:text-lg lg:text-xl font-black text-yellow-400 leading-tight tabular-nums",
  hudTimerValueUrgent:
    "text-sm md:text-lg lg:text-xl font-black text-red-400 leading-tight tabular-nums",
  hudAvatarBtn:
    "bg-black/30 border border-white/10 rounded-lg py-1.5 px-0.5 md:py-2 md:px-1 lg:px-1.5 text-center flex flex-col items-stretch justify-start min-h-[50px] md:min-h-[58px] lg:min-h-[62px] hover:bg-purple-500/20 transition-all cursor-pointer",

  pageTitle: "text-2xl md:text-3xl lg:text-4xl font-extrabold text-white",
  pageSub: "text-white/70 text-xs md:text-sm",

  navBtn:
    "min-w-[100px] px-3 py-1 rounded-lg text-sm font-bold bg-emerald-500/20 border border-emerald-400/30 hover:bg-emerald-500/30 text-emerald-200",
  backBtn:
    "min-w-[60px] px-3 py-1 rounded-lg text-sm font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white",

  modeTabActive:
    "h-8 md:h-10 lg:h-11 px-3 md:px-4 lg:px-5 rounded-lg text-xs md:text-sm lg:text-base font-bold transition-all flex-shrink-0 bg-emerald-500/90 text-white border border-emerald-400/45 shadow-sm",
  modeTabInactive:
    "h-8 md:h-10 lg:h-11 px-3 md:px-4 lg:px-5 rounded-lg text-xs md:text-sm lg:text-base font-bold transition-all flex-shrink-0 bg-white/10 text-white/70 border border-white/15 hover:border-emerald-400/35 hover:bg-white/20 shadow-sm",

  coinBadgeDesktop:
    "hidden md:inline-flex items-center justify-center gap-1.5 md:gap-2 shrink-0 rounded-lg border border-amber-400/45 bg-black/35 md:h-10 lg:h-11 md:px-4 lg:px-5 md:text-sm lg:text-base font-bold tabular-nums shadow-sm text-white",
  coinBadgeMobile:
    "md:hidden inline-flex items-center justify-center gap-1.5 shrink-0 rounded-lg border border-amber-400/45 bg-black/35 px-3 py-2 text-xs font-bold tabular-nums shadow-sm text-white",
  coinBadgeLabel: "text-white",
  coinBadgeValue: "text-amber-100",

  preGameTile:
    "bg-black/25 border border-white/15 rounded-lg md:rounded-xl px-1 py-2 md:px-2 md:py-3 min-h-[4.5rem] md:min-h-[5.25rem] lg:min-h-[5.75rem] flex flex-col items-stretch justify-start gap-1 md:gap-1.5 min-w-0 shadow-sm",
  preGameTileLabel:
    "text-[10px] md:text-[13px] lg:text-sm text-white/78 md:text-white/85 lg:text-white/90 text-center leading-tight max-w-full line-clamp-2",
  preGameTileValueEmerald:
    "text-base md:text-xl lg:text-2xl font-bold text-emerald-300 tabular-nums leading-tight",
  preGameTileValueAmber:
    "text-base md:text-xl lg:text-2xl font-bold text-amber-300 tabular-nums leading-tight",
  preGameTileValueBlue:
    "text-base md:text-xl lg:text-2xl font-bold text-blue-300 tabular-nums leading-tight",
  preGamePlayerBadge:
    "h-10 md:h-11 shrink-0 w-[3.5rem] md:w-[8.5rem] lg:w-[9.25rem] px-1.5 md:px-3 lg:px-3.5 rounded-lg bg-black/30 border border-white/20 text-white text-xs md:text-sm font-bold box-border flex items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap select-none pointer-events-none min-w-0",
  preGameGearBtn:
    "h-10 w-10 md:h-11 md:w-11 shrink-0 rounded-lg bg-blue-500/80 hover:bg-blue-500 border border-white/20 text-white text-sm md:text-base font-bold flex items-center justify-center box-border",
  selectControl:
    "h-10 md:h-11 shrink-0 min-w-0 rounded-lg bg-black/30 border border-white/20 text-white text-xs md:text-sm font-bold px-2 box-border overflow-hidden text-ellipsis whitespace-nowrap",

  btnPrimary:
    "h-9 md:h-10 px-4 md:px-5 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 disabled:bg-gray-500/50 disabled:text-white/50 disabled:cursor-not-allowed font-bold text-xs md:text-sm text-white shadow-sm",
  btnAction:
    "h-9 md:h-10 px-3 md:px-4 rounded-lg font-bold text-xs md:text-sm text-white shadow-sm border border-transparent",
  btnActionHelp:
    "px-4 py-2 md:px-5 md:py-2.5 rounded-lg font-bold text-xs md:text-sm text-white shadow-sm border border-transparent",
  btnActionBlue: "bg-blue-600/90 hover:bg-blue-600 border-blue-700",
  btnActionOrange: "bg-orange-500/90 hover:bg-orange-500 border-orange-600",
  btnActionCyan: "bg-cyan-600/90 hover:bg-cyan-600 border-cyan-700",
  btnActionPurple: "bg-violet-600/90 hover:bg-violet-600 border-violet-700",
  btnActionPink: "bg-rose-500/90 hover:bg-rose-500 border-rose-600",
  btnActionTeal:
    "bg-teal-600/90 hover:bg-teal-600 text-white border-2 border-teal-700 shadow-md",
  btnActionTealOutline:
    "bg-black/30 text-teal-100 border-2 border-teal-500/60 hover:bg-teal-950/40 shadow-sm font-extrabold",
  btnOpenSmall:
    "h-7 md:h-8 w-full max-w-[3.5rem] md:max-w-[4rem] px-1.5 md:px-2 rounded-md bg-blue-500/85 hover:bg-blue-500 text-white text-[11px] md:text-sm lg:text-base font-bold",

  scratchpadOpenBtn:
    "inline-flex items-center justify-center px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white border border-indigo-400/45 shadow-sm",
  btnHint:
    "inline-flex items-center justify-center px-4 py-2 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm font-bold bg-amber-500/90 hover:bg-amber-500 text-white shadow-sm",
  btnStepByStep:
    "inline-flex items-center justify-center min-h-11 px-4 md:px-5 rounded-lg text-xs md:text-sm font-bold bg-indigo-600/90 hover:bg-indigo-600 text-white shadow-sm",
  btnPrevExercise:
    "inline-flex items-center justify-center min-h-11 px-4 md:px-5 rounded-lg text-xs md:text-sm font-bold bg-cyan-600/90 hover:bg-cyan-600 text-white shadow-sm",
  btnShowTable:
    "inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600/90 hover:bg-blue-600 text-white shadow-lg transition-all",
  btnStop:
    "inline-flex items-center justify-center min-h-11 px-4 md:px-5 rounded-lg text-xs md:text-sm font-bold bg-rose-600/90 hover:bg-rose-600 text-white shadow-sm",
  adSlot:
    "w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-4xl mx-auto shrink-0 h-10 md:h-12 min-h-[2.5rem] rounded-lg border border-dashed border-white/15 bg-white/[0.03] pointer-events-none flex items-center justify-center",
  adSlotLabel: "text-xs md:text-sm font-medium text-white/35 select-none",
  btnSoundOn:
    "h-7 w-7 rounded-lg border border-white/20 text-white text-sm font-bold flex items-center justify-center transition-all flex-shrink-0 bg-green-500/80 hover:bg-green-500",
  btnSoundOff:
    "h-7 w-7 rounded-lg border border-white/20 text-white text-sm font-bold flex items-center justify-center transition-all flex-shrink-0 bg-red-500/80 hover:bg-red-500",

  gameCardSkin: "",
  questionSurfaceSkin: "",

  questionLead:
    "text-2xl text-center text-white mb-2 break-words overflow-wrap-anywhere max-w-full px-2",
  questionBody: "text-4xl text-center text-white font-bold max-w-full px-2",
  questionFormula:
    "text-center text-white font-bold font-mono max-w-full px-2 py-1 leading-snug",
  questionPre: "text-3xl text-center text-white font-bold font-mono whitespace-pre",

  answerWrap: "w-full mb-3 p-4 max-[420px]:p-1.5 max-[420px]:mb-1.5 rounded-lg bg-blue-500/20 border border-blue-400/50",
  answerMcqGridCompact: "max-[420px]:gap-2 max-[420px]:mb-2",
  answerMcqBtnCompactXl: "max-[420px]:px-3 max-[420px]:py-3 max-[420px]:text-lg",
  answerMcqBtnCompactLg: "max-[420px]:px-3 max-[420px]:py-3 max-[420px]:text-base",

  choiceDefault:
    "bg-[#2878A5] border-2 border-[#1E6289] text-white font-bold shadow-sm hover:bg-[#226B94] hover:border-[#1E6289]",
  choiceSelected:
    "bg-[#7047D7] border-2 border-[#5B21A8] text-white font-bold shadow-sm",
  choiceCorrect: "bg-emerald-500/30 border-emerald-400 text-emerald-200",
  choiceWrong: "bg-red-500/30 border-red-400 text-red-200",

  checkBtn:
    "px-6 py-3 rounded-lg font-bold text-lg max-[420px]:px-4 max-[420px]:py-2 max-[420px]:text-base disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500/80 hover:bg-emerald-500 text-white",
  checkBtnNext:
    "px-6 py-3 rounded-lg font-bold text-lg max-[420px]:px-4 max-[420px]:py-2 max-[420px]:text-base disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500/80 hover:bg-blue-500 text-white",

  vkKey: "",
  vkKeyCompact: "",
  vkClearKeyCompact: "",
  vkSubmitGreen: "",
  vkSubmitBlue: "",
  vkPad: "mt-1",

  inputDesktop: "",
  inputMobile: "",

  explVertical:
    "mb-3 rounded-lg bg-emerald-900/50 border border-emerald-500/15 px-3 py-2 text-center font-mono text-base leading-relaxed whitespace-pre text-emerald-100",

  floatBtn:
    "absolute z-10 inline-flex items-center justify-center h-8 min-h-8 px-3 rounded-lg text-xs font-bold leading-none shadow-lg transition-all text-white",
  floatBtnCornerLeft: "top-2 left-2",
  floatBtnStack:
    "absolute top-2 right-2 z-10 flex flex-col gap-1.5 pointer-events-auto min-w-[5.5rem]",
  floatBtnHelper:
    "inline-flex items-center justify-center h-8 min-h-8 px-3 rounded-lg text-xs font-bold leading-none shadow-lg transition-all text-white text-center whitespace-nowrap",
  questionActionBtn:
    "inline-flex items-center justify-center h-8 min-h-8 px-2 rounded-lg text-xs font-bold leading-none shadow-lg transition-all whitespace-nowrap text-white w-full max-w-full",
  questionMobileActionDock:
    "md:hidden absolute bottom-2 inset-x-2 z-10 grid grid-cols-[5.75rem_minmax(0,1fr)_5.75rem] items-center gap-x-1 pointer-events-none",
  questionMobileActionDockWideSecondary:
    "md:hidden absolute bottom-2 inset-x-2 z-10 grid grid-cols-[5.75rem_minmax(0,1fr)_auto] items-center gap-x-1 pointer-events-none",
  floatBtnPurple: "bg-purple-500/80 hover:bg-purple-500 text-white",
  floatBtnScratchpad:
    "bg-indigo-600/90 hover:bg-indigo-600 text-white border border-indigo-400/40",
  floatBtnTeal: "bg-teal-800/80 hover:bg-teal-700/90 text-teal-50",
  floatBtnTable: "bg-blue-600/90 hover:bg-blue-600 text-white",
  floatBtnBookColors:
    "bg-teal-800/80 hover:bg-teal-700/90 border border-teal-400/35 text-teal-50",
  floatBtnBook:
    "bg-teal-800/80 hover:bg-teal-700/90 border border-teal-400/35 text-teal-50 top-2 right-2",
  floatBtnTheory:
    "bg-purple-500/90 hover:bg-purple-500 text-white border border-purple-400/40 top-2 left-2",

  feedbackOk: "bg-emerald-500/20 text-emerald-200",
  feedbackBad: "bg-red-500/20 text-red-200",
  feedbackOkAnim: "bg-emerald-500/40 text-emerald-100 scale-110 shadow-lg shadow-emerald-500/50",
  feedbackBadAnim: "bg-red-500/40 text-red-100 scale-105 shadow-lg shadow-red-500/50",
  hintBox: "bg-blue-500/10 border border-blue-400/50 rounded-lg p-3 text-right",
  hintTitle: "text-xs font-semibold text-blue-200/95 mb-1.5 tracking-tight",
  hintBody: "text-sm text-blue-100/95 leading-relaxed",
  errorBox: "bg-[#0a1222]/95 border border-rose-300/60 rounded-lg p-3 text-right shadow-xl backdrop-blur-sm",
  errorTitle: "text-xs font-semibold text-rose-100 mb-1.5 tracking-tight",
  errorBody: "text-sm text-rose-50 leading-relaxed",

  answerActionsBar: "mt-0 flex gap-2 justify-center flex-wrap w-full max-w-full",

  mutedHint: "text-xs text-white/60 text-center mb-1",
});

export const LEARNING_MASTER_CLASSIC = MATH_CLASSIC;
