/**
 * Bright layout tokens for `/student/activity/[activityId]` - classic tokens stay in
 * `student-activity-layout.client.js`.
 */

export const STUDENT_ACTIVITY_LAYOUT_BRIGHT = {
  page: "w-full max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-3",

  headerRow: "flex items-start justify-between gap-3 mb-2",
  headerNavGroup: "flex items-center gap-2 shrink-0",
  backLink:
    "shrink-0 min-w-[60px] px-3 py-1 rounded-lg text-sm font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 shadow-sm whitespace-nowrap",
  titleBlock: "min-w-0 flex-1 text-right",
  title: "text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 leading-tight",
  subtitle: "text-slate-600 text-xs sm:text-sm mt-0.5",

  progressTrack: "h-1.5 rounded-full bg-sky-200/80 mb-3 overflow-hidden",
  progressFill: "h-full bg-sky-600 transition-all",

  card:
    "w-full rounded-xl border-2 border-sky-200 bg-white/95 shadow-md shadow-sky-100/70 p-3 sm:p-4 lg:p-5 overflow-visible",
  cardGrid: "flex flex-col gap-3 min-w-0",

  questionStage:
    "relative w-full min-h-[9.5rem] sm:min-h-[9rem] flex flex-col items-center justify-center gap-2 overflow-visible px-1 sm:px-2 py-1",
  questionStageInner:
    "relative w-full flex flex-col items-center justify-center gap-2 overflow-visible",

  mathVerticalQuestionSurface:
    "relative w-full flex flex-col items-center justify-center overflow-visible min-h-[11.5rem] sm:min-h-[10rem]",
  mathVerticalExerciseSlot:
    "w-full flex flex-col items-center justify-center overflow-visible px-1 min-h-[8.25rem] sm:min-h-[7rem]",

  questionLead:
    "text-center text-slate-800 font-medium break-words max-w-full px-1 sm:px-2",
  questionBody:
    "text-center text-slate-900 font-bold max-w-full px-1 sm:px-2 break-words",
  questionFormula:
    "text-center text-slate-900 font-bold font-mono max-w-full px-1 sm:px-2 leading-snug",

  actionsPanel: "w-full flex flex-col gap-2.5 lg:pt-0 min-w-0",

  answerWrap:
    "w-full mb-3 p-4 max-[420px]:p-1.5 max-[420px]:mb-1.5 rounded-xl bg-sky-100 border-2 border-sky-400 shadow-md shadow-sky-200/70 ring-1 ring-sky-300/60",

  choiceButton:
    "w-full text-right px-3 py-2.5 rounded-xl border-2 min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base shadow-sm",
  choiceButtonSelected: "border-sky-500 bg-sky-100 text-slate-900",
  choiceButtonDefault:
    "border-slate-300 bg-white text-slate-900 hover:border-sky-400 hover:bg-sky-50",

  textInput:
    "w-full rounded-xl bg-white border-2 border-sky-300 px-3 py-3 text-slate-900 read-only:opacity-80 read-only:cursor-not-allowed text-base sm:text-lg shadow-inner shadow-sky-50",

  submitButton:
    "w-full rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 disabled:opacity-50 shadow-sm",

  feedbackBox: "text-sm rounded-lg px-3 py-2",
  feedbackCorrect: "bg-emerald-100 text-emerald-900 border border-emerald-300",
  feedbackSubmitted: "bg-sky-50 text-slate-800 border border-sky-200",
  feedbackError: "bg-rose-100 text-rose-900 border border-rose-300",
  feedbackWrong: "bg-amber-100 text-amber-900 border border-amber-300",
  hintText: "text-xs text-slate-500",
  explanationBanner:
    "text-sm text-sky-900 rounded-lg border-2 border-sky-300 bg-sky-50 px-3 py-2",
  waitText: "text-amber-700 text-sm font-medium",

  footerNav: "mt-3 flex flex-wrap gap-2 justify-center lg:justify-end",
  footerButton:
    "px-4 py-2 rounded-xl border-2 border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-sky-50 hover:border-sky-400 shadow-sm",
  footerSubmit:
    "px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm",

  layoutFooterOffsetPx: 72,

  scratchpadDockShell:
    "fixed inset-x-0 z-40 pointer-events-none border-t-2 border-sky-200 bg-[linear-gradient(180deg,rgba(214,255,246,0.98),rgba(196,244,255,0.96))] backdrop-blur-md shadow-[0_-4px_24px_rgba(14,165,233,0.12)]",
  scratchpadDockInner:
    "pointer-events-auto w-full max-w-6xl mx-auto px-3 sm:px-4 pt-1.5 pb-1.5 flex flex-col gap-1",
  scratchpadDockActionsPanel: "w-full flex flex-col gap-1 min-w-0",
  scratchpadDockFinishRow: "w-full flex flex-row flex-wrap gap-2 justify-center items-center",
  scratchpadDockFinishButton:
    "shrink-0 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-sm disabled:opacity-50 shadow-sm",
  scratchpadDockSecondaryButton:
    "shrink-0 px-3 py-2 rounded-xl border-2 border-slate-300 bg-white text-slate-800 text-sm font-semibold hover:bg-sky-50 shadow-sm",
  scratchpadDockScratchpadButton:
    "shrink-0 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm whitespace-nowrap shadow-sm",
  scratchpadDockScratchpadButtonOpen: "bg-sky-600 hover:bg-sky-500",
  scratchpadDockDesktopButtonRow:
    "w-full flex flex-row flex-wrap items-center justify-center gap-3 pt-2",
  scratchpadDockDesktopSubmitButton:
    "shrink-0 min-h-[3rem] min-w-[9.5rem] px-7 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-base font-bold whitespace-nowrap disabled:opacity-50 shadow-sm",
  scratchpadDockDesktopScratchpadButton:
    "shrink-0 min-h-[3rem] min-w-[8.5rem] px-7 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-base font-semibold whitespace-nowrap shadow-sm",
  scratchpadDockDesktopScratchpadButtonOpen: "bg-sky-600 hover:bg-sky-500",
  scratchpadDockDesktopSecondaryButton:
    "shrink-0 min-h-[3rem] min-w-[8.5rem] px-7 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-800 text-base font-semibold whitespace-nowrap hover:bg-sky-50 shadow-sm",
  scratchpadDockDesktopFinishButton:
    "shrink-0 min-h-[3rem] min-w-[8.5rem] px-7 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-base font-semibold whitespace-nowrap disabled:opacity-50 shadow-sm",
  scratchpadOpenQuestionStage: "min-h-0 sm:min-h-0 py-0",

  mathToggle:
    "absolute top-1 left-1 z-10 px-2.5 py-1 rounded-lg text-xs font-bold bg-violet-500 hover:bg-violet-600 text-white transition-all pointer-events-auto shadow-md border border-violet-600",

  loadingText: "text-slate-700",
  errorText: "text-rose-700",
  errorLink: "text-sky-700 underline font-semibold",
  doneTitle: "text-2xl font-bold text-slate-900",
  doneScore: "text-xl font-bold text-emerald-700",
  doneBody: "text-slate-600 text-sm",
  doneButton:
    "inline-flex rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 shadow-sm",
};

/**
 * Textual assigned activities: question fills remaining height; answers + actions
 * sit at the bottom above the site ad band. Never applied to math/geometry.
 */
export const STUDENT_ACTIVITY_LAYOUT_BRIGHT_TEXTUAL_OVERRIDES = {
  page:
    "w-full max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex flex-col overflow-hidden h-[calc(100dvh-3.75rem-72px)] max-h-[calc(100dvh-3.75rem-72px)]",

  headerRow: "flex items-start justify-between gap-3 mb-2 shrink-0",
  title: "text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 leading-tight",
  subtitle: "text-slate-600 text-xs sm:text-sm mt-0.5",

  progressTrack: "h-1.5 rounded-full bg-sky-200/80 mb-2 overflow-hidden shrink-0",

  card:
    "w-full flex-1 min-h-0 flex flex-col rounded-xl border-2 border-sky-200 bg-white shadow-md shadow-sky-100/60 p-3 sm:p-4 overflow-hidden",
  cardGrid: "flex flex-col flex-1 min-h-0 gap-3 sm:gap-4",

  questionStage:
    "relative w-full flex-1 min-h-0 flex flex-col items-center justify-center gap-2 overflow-hidden px-1 sm:px-2 py-2",
  questionStageInner:
    "relative w-full max-h-full flex flex-col items-center justify-center gap-2 overflow-y-auto",

  questionLead:
    "text-center text-slate-700 font-medium break-words max-w-full px-1",
  questionBody:
    "text-center text-slate-900 font-bold max-w-full px-1 break-words",

  actionsPanel: "w-full flex flex-col gap-2.5 sm:gap-3 shrink-0 min-w-0 pt-1",

  answerWrap:
    "w-full p-2.5 sm:p-3.5 rounded-xl bg-sky-100 border-2 border-sky-400 shadow-md shadow-sky-200/60 ring-1 ring-sky-300/50",

  choiceButton:
    "w-full h-full text-center px-3 py-3 sm:px-4 sm:py-3.5 rounded-xl border-2 min-h-[3rem] sm:min-h-[3.5rem] disabled:opacity-60 disabled:cursor-not-allowed text-base sm:text-lg font-bold leading-snug break-words overflow-wrap-anywhere flex items-center justify-center shadow-sm transition-colors",
  choiceButtonSelected:
    "border-[#5B21A8] bg-[#7047D7] text-white shadow-md",
  choiceButtonDefault:
    "border-[#1E6289] bg-[#2878A5] text-white hover:bg-[#226B94] hover:border-[#1E6289]",

  textInput:
    "w-full rounded-xl bg-white border-2 border-sky-300 px-3 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/70 focus:border-sky-500 read-only:opacity-80 read-only:cursor-not-allowed text-base sm:text-lg font-semibold shadow-inner shadow-sky-50",

  submitButton:
    "w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 text-base sm:text-lg disabled:opacity-50 shadow-sm",

  scratchpadDockDesktopButtonRow:
    "w-full flex flex-row flex-nowrap items-center justify-center gap-3 sm:gap-4 pt-1 pb-0.5",
  scratchpadDockDesktopSubmitButton:
    "shrink-0 min-h-[3.25rem] min-w-[10rem] px-8 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-base font-bold whitespace-nowrap disabled:opacity-50 shadow-sm",
  scratchpadDockDesktopSecondaryButton:
    "shrink-0 min-h-[3.25rem] min-w-[9rem] px-7 py-3.5 rounded-xl border-2 border-slate-300 bg-white text-slate-800 text-base font-semibold whitespace-nowrap hover:bg-sky-50 shadow-sm",
  scratchpadDockDesktopFinishButton:
    "shrink-0 min-h-[3.25rem] min-w-[9rem] px-7 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-base font-semibold whitespace-nowrap disabled:opacity-50 shadow-sm",

  scratchpadDockFinishRow:
    "w-full flex flex-row flex-wrap gap-2 justify-center items-center",

  footerNav: "hidden",
  footerButton:
    "px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-800 text-sm sm:text-base font-semibold hover:bg-sky-50 hover:border-sky-400 shadow-sm",
  footerSubmit:
    "px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm sm:text-base shadow-sm",
};
