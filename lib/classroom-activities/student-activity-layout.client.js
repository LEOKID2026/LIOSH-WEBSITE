/**
 * Unified layout contract for `/student/activity/[activityId]` — all scopes/subjects.
 * Single source of truth for spacing, grid, and panel sizing.
 */

export const STUDENT_ACTIVITY_LAYOUT = {
  /** Page shell */
  page: "w-full max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-3",

  /** Header row: back link (physical left) + title block (RTL) */
  headerRow: "flex items-start justify-between gap-3 mb-2",
  backLink:
    "shrink-0 text-sm text-white/60 hover:text-white pt-0.5 whitespace-nowrap",
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

  choiceButton:
    "w-full text-right px-3 py-2.5 rounded-xl border min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed text-sm sm:text-base",
  choiceButtonSelected: "border-cyan-400 bg-cyan-500/20",
  choiceButtonDefault: "border-white/15 hover:bg-white/5",

  textInput:
    "w-full rounded-xl bg-black/30 border border-white/20 px-3 py-3 text-white read-only:opacity-80 read-only:cursor-not-allowed text-base sm:text-lg",

  submitButton:
    "w-full rounded-xl bg-cyan-500 text-black font-bold py-3 disabled:opacity-50",

  feedbackBox: "text-sm rounded-lg px-3 py-2",

  /** Footer nav outside card */
  footerNav: "mt-3 flex flex-wrap gap-2 justify-center lg:justify-end",
  footerButton: "px-4 py-2 rounded-xl border border-white/20 text-sm",
  footerSubmit: "px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-sm",

  mathToggle:
    "absolute top-1 left-1 z-10 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/80 hover:bg-purple-500 text-white transition-all pointer-events-auto shadow-lg",
};
