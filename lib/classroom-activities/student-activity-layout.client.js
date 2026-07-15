/**
 * Unified layout contract for `/student/activity/[activityId]` - all scopes/subjects.
 * Single source of truth for spacing, grid, and panel sizing.
 */

export const STUDENT_ACTIVITY_LAYOUT = {
  /** Page shell */
  page: "w-full max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-3",

  /** Header row: back link (physical left) + title block (RTL) */
  headerRow: "flex items-start justify-between gap-3 mb-2",
  headerNavGroup: "flex items-center gap-2 shrink-0",
  backLink:
    "shrink-0 min-w-[60px] px-3 py-1 rounded-lg text-sm font-bold bg-white/10 border border-white/20 hover:bg-white/15 text-white/90 shadow-sm whitespace-nowrap",
  titleBlock: "min-w-0 flex-1 text-right",
  title: "text-lg sm:text-xl lg:text-2xl font-bold text-white leading-tight",
  subtitle: "text-white/60 text-xs sm:text-sm mt-0.5",

  /** Progress */
  progressTrack: "h-1.5 rounded-full bg-black/40 mb-3 overflow-hidden",
  progressFill: "h-full bg-cyan-500 transition-all",

  /** Main card — full width on desktop, no inner scroll */
  card: "w-full rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:p-4 lg:p-5 overflow-visible",
  /** Full-width stack: question uses entire card width on desktop (no narrow half-column trap). */
  cardGrid: "flex flex-col gap-3 min-w-0",

  /**
   * Visual/question stage — grows with content; no fixed max-height or inner scroll.
   * Modest min-height softens layout reflow (math vertical toggle, geometry diagram).
   */
  questionStage:
    "relative w-full min-h-[9.5rem] sm:min-h-[9rem] flex flex-col items-center justify-center gap-2 overflow-visible px-1 sm:px-2 py-1",
  questionStageInner:
    "relative w-full flex flex-col items-center justify-center gap-2 overflow-visible",

  /**
   * Math vertical/horizontal toggle — reserve exercise height so the actions/keyboard row
   * does not jump when switching to vertical layout (especially on mobile).
   */
  mathVerticalQuestionSurface:
    "relative w-full flex flex-col items-center justify-center overflow-visible min-h-[11.5rem] sm:min-h-[10rem]",
  mathVerticalExerciseSlot:
    "w-full flex flex-col items-center justify-center overflow-visible px-1 min-h-[8.25rem] sm:min-h-[7rem]",

  /** Shared question typography — size from getStudentActivityQuestionFontStyle, not fixed text-* */
  questionLead:
    "text-center text-white font-medium break-words max-w-full px-1 sm:px-2",
  questionBody:
    "text-center text-white font-bold max-w-full px-1 sm:px-2 break-words",
  questionFormula:
    "text-center text-white font-bold font-mono max-w-full px-1 sm:px-2 leading-snug",

  /** Actions column */
  actionsPanel: "w-full flex flex-col gap-2.5 lg:pt-0 min-w-0",

  answerWrap:
    "w-full mb-3 p-4 max-[420px]:p-1.5 max-[420px]:mb-1.5 rounded-xl bg-blue-500/20 border-2 border-blue-400/50 shadow-md shadow-black/25 ring-1 ring-blue-400/30",

  choiceButton:
    "w-full text-right px-3 py-2.5 rounded-xl border min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base",
  choiceButtonSelected: "border-cyan-400 bg-cyan-500/20",
  choiceButtonDefault: "border-white/15 hover:bg-white/5",

  textInput:
    "w-full rounded-xl bg-black/30 border border-white/20 px-3 py-3 text-white read-only:opacity-80 read-only:cursor-not-allowed text-base sm:text-lg",

  submitButton:
    "w-full rounded-xl bg-cyan-500 text-black font-bold py-3 disabled:opacity-50",

  feedbackBox: "text-sm rounded-lg px-3 py-2",
  feedbackCorrect: "bg-emerald-500/20 text-emerald-100",
  feedbackSubmitted: "bg-white/10 text-white/90",
  feedbackError: "bg-red-500/20 text-red-100",
  feedbackWrong: "bg-amber-500/20 text-amber-100",
  hintText: "text-xs text-white/50",
  explanationBanner:
    "text-sm text-cyan-200/90 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2",
  waitText: "text-amber-200 text-sm",

  /** Footer nav outside card */
  footerNav: "mt-3 flex flex-wrap gap-2 justify-center lg:justify-end",
  footerButton: "px-4 py-2 rounded-xl border border-white/20 text-sm",
  footerSubmit: "px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm",

  /** Site legal footer + ad band — scratchpad dock sits just above fixed chrome */
  layoutFooterOffsetPx: 72,

  /**
   * Fixed bottom dock while math scratchpad is open: keyboard → finish submit,
   * sitting just above the site footer HUD. Anchor at dock top sets overlay bottom.
   */
  scratchpadDockShell:
    "fixed inset-x-0 z-40 pointer-events-none border-t border-white/10 bg-[#0b1020]/95 backdrop-blur-md",
  scratchpadDockInner:
    "pointer-events-auto w-full max-w-6xl mx-auto px-3 sm:px-4 pt-1.5 pb-1.5 flex flex-col gap-1",
  scratchpadDockActionsPanel: "w-full flex flex-col gap-1 min-w-0",
  scratchpadDockFinishRow: "w-full flex flex-row flex-wrap gap-2 justify-center items-center",
  scratchpadDockFinishButton:
    "shrink-0 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-sm disabled:opacity-50",
  scratchpadDockSecondaryButton:
    "shrink-0 px-3 py-2 rounded-xl border border-white/20 text-sm text-white/90",
  scratchpadDockScratchpadButton:
    "shrink-0 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-sm whitespace-nowrap",
  scratchpadDockScratchpadButtonOpen: "bg-sky-600 hover:bg-sky-500",
  scratchpadDockDesktopButtonRow:
    "w-full flex flex-row flex-wrap items-center justify-center gap-3 pt-2",
  scratchpadDockDesktopSubmitButton:
    "shrink-0 min-h-[3rem] min-w-[9.5rem] px-7 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-base font-bold whitespace-nowrap disabled:opacity-50",
  scratchpadDockDesktopScratchpadButton:
    "shrink-0 min-h-[3rem] min-w-[8.5rem] px-7 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-black text-base font-semibold whitespace-nowrap",
  scratchpadDockDesktopScratchpadButtonOpen:
    "bg-sky-600 hover:bg-sky-500",
  scratchpadDockDesktopSecondaryButton:
    "shrink-0 min-h-[3rem] min-w-[8.5rem] px-7 py-3 rounded-xl border border-white/20 text-base text-white/90 font-semibold whitespace-nowrap",
  scratchpadDockDesktopFinishButton:
    "shrink-0 min-h-[3rem] min-w-[8.5rem] px-7 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-base font-semibold whitespace-nowrap disabled:opacity-50",
  scratchpadOpenQuestionStage: "min-h-0 sm:min-h-0 py-0",

  mathToggle:
    "absolute top-1 left-1 z-10 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/80 hover:bg-purple-500 text-white transition-all pointer-events-auto shadow-lg",

  loadingText: "text-white/80",
  errorText: "text-red-200",
  errorLink: "text-amber-300 underline",
  doneTitle: "text-2xl font-bold text-white",
  doneScore: "text-xl font-bold text-emerald-300",
  doneBody: "text-white/70 text-sm",
  doneButton: "inline-flex rounded-xl bg-emerald-500 text-black font-bold px-6 py-3",
};

/**
 * Textual assigned activities: question fills remaining height; answers + actions
 * sit at the bottom above the site ad band. Never applied to math/geometry.
 */
export const STUDENT_ACTIVITY_LAYOUT_TEXTUAL_OVERRIDES = {
  page:
    "w-full max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex flex-col overflow-hidden h-[calc(100dvh-3.75rem-72px)] max-h-[calc(100dvh-3.75rem-72px)]",

  headerRow: "flex items-start justify-between gap-3 mb-2 shrink-0",
  title: "text-lg sm:text-xl lg:text-2xl font-bold text-white leading-tight",
  subtitle: "text-white/60 text-xs sm:text-sm mt-0.5",

  progressTrack: "h-1.5 rounded-full bg-black/40 mb-2 overflow-hidden shrink-0",

  card:
    "w-full flex-1 min-h-0 flex flex-col rounded-xl border border-white/15 bg-white/[0.06] p-3 sm:p-4 overflow-hidden shadow-sm shadow-black/20",
  cardGrid: "flex flex-col flex-1 min-h-0 gap-3 sm:gap-4",

  questionStage:
    "relative w-full flex-1 min-h-0 flex flex-col items-center justify-center gap-2 overflow-hidden px-1 sm:px-2 py-2",
  questionStageInner:
    "relative w-full max-h-full flex flex-col items-center justify-center gap-2 overflow-y-auto",

  questionLead:
    "text-center text-white/90 font-medium break-words max-w-full px-1",
  questionBody:
    "text-center text-white font-bold max-w-full px-1 break-words",

  actionsPanel: "w-full flex flex-col gap-2.5 sm:gap-3 shrink-0 min-w-0 pt-1",

  answerWrap:
    "w-full p-2.5 sm:p-3.5 rounded-xl bg-blue-500/20 border-2 border-blue-400/55 shadow-md shadow-black/20 ring-1 ring-blue-400/25",

  choiceButton:
    "w-full h-full text-center px-3 py-3 sm:px-4 sm:py-3.5 rounded-xl border-2 min-h-[3rem] sm:min-h-[3.5rem] disabled:opacity-60 disabled:cursor-not-allowed text-base sm:text-lg font-bold leading-snug break-words overflow-wrap-anywhere flex items-center justify-center shadow-sm transition-colors",
  choiceButtonSelected:
    "border-[#5B21A8] bg-[#7047D7] text-white shadow-md",
  choiceButtonDefault:
    "border-[#1E6289] bg-[#2878A5] text-white hover:bg-[#226B94] hover:border-[#1E6289]",

  textInput:
    "w-full rounded-xl bg-black/30 border-2 border-white/25 px-3 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 focus:border-cyan-400/70 read-only:opacity-80 read-only:cursor-not-allowed text-base sm:text-lg font-semibold",

  submitButton:
    "w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 text-base sm:text-lg disabled:opacity-50 shadow-sm",

  scratchpadDockDesktopButtonRow:
    "w-full flex flex-row flex-nowrap items-center justify-center gap-3 sm:gap-4 pt-1 pb-0.5",
  scratchpadDockDesktopSubmitButton:
    "shrink-0 min-h-[3.25rem] min-w-[10rem] px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-base font-bold whitespace-nowrap disabled:opacity-50",
  scratchpadDockDesktopSecondaryButton:
    "shrink-0 min-h-[3.25rem] min-w-[9rem] px-7 py-3.5 rounded-xl border border-white/20 text-base text-white/90 font-semibold whitespace-nowrap",
  scratchpadDockDesktopFinishButton:
    "shrink-0 min-h-[3.25rem] min-w-[9rem] px-7 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-base font-semibold whitespace-nowrap disabled:opacity-50",

  scratchpadDockFinishRow:
    "w-full flex flex-row flex-wrap gap-2 justify-center items-center",

  footerNav: "hidden",
  footerButton:
    "px-4 py-2.5 rounded-xl border border-white/25 text-sm sm:text-base font-semibold text-white/90 hover:bg-white/10",
  footerSubmit:
    "px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm sm:text-base shadow-sm",
};
