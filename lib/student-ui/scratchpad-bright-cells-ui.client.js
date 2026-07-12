/**
 * Bright-mode scratchpad cell/grid tokens — all scratchpad types.
 * Classic mode keeps WORK_CELL_CLASS / OPERAND_CELL_CLASS in MathScratchpadWorkspace.
 */

export const SCRATCHPAD_BRIGHT_CELLS = Object.freeze({
  exerciseText:
    "text-center font-mono text-lg md:text-xl text-slate-900 font-bold shrink-0 tabular-nums",
  workCell:
    "w-9 h-9 md:w-10 md:h-10 text-center text-base md:text-lg bg-white border-2 border-sky-300 rounded-md text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200",
  tableCell: "border border-sky-300/80 p-0.5 bg-white/85",
  tableCellStrong: "border border-sky-300/80 p-0.5 bg-white/85",
  operandCell:
    "w-9 h-9 md:w-10 md:h-10 text-center text-base md:text-lg rounded-md text-slate-900 bg-sky-100 border-2 border-sky-400 font-bold tabular-nums",
  carryCell:
    "w-9 h-9 md:w-10 md:h-10 text-center text-base md:text-lg bg-amber-50 border-2 border-amber-300 rounded-md text-amber-950 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100",
  carryTableCell: "border border-amber-300/70 p-0.5 bg-amber-50/60",
  headerCell:
    "border border-sky-300/80 px-1 py-1 text-xs text-slate-700 min-w-[2.25rem] font-semibold bg-sky-100/90",
  carryLabel:
    "border-0 py-0.5 text-[10px] md:text-xs font-semibold text-amber-800 text-end pe-1",
  resultSeparator: "border-t-2 border-sky-400",
  /** Legacy amber separators (non–long-division). */
  divisionSeparatorH: "border-t-2 border-amber-400",
  divisionSeparatorV: "border-l-2 border-l-amber-400",
  /** Semantic long-division bracket / dividend bar. */
  longDivisionStructureH: "border-t-2 border-red-500",
  longDivisionStructureV: "border-l-2 border-l-red-500",
  mutedText: "text-slate-600",
  mutedTextXs: "text-xs text-slate-600",
  labelText: "text-sm font-bold text-slate-800 font-mono",
  sectionTitle: "text-xs font-semibold text-slate-700",
  sectionBox: "rounded-lg border border-sky-200 bg-white/75 p-3 min-h-[4rem]",
  sectionDashed: "min-h-[2.5rem] border border-dashed border-sky-200 rounded bg-white/50",
  inlineInput:
    "text-center bg-white border-2 border-sky-200 rounded-md text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200",
  dotActive: "bg-amber-400 border-amber-500",
  dotIdle: "bg-white border-sky-200",
  gridDotActive: "bg-sky-500 border-sky-600",
  gridDotIdle: "bg-white border-sky-200",
  blockBar: "rounded bg-sky-200 border border-sky-400",
  blockUnit: "rounded bg-sky-300 border border-sky-500",
  objectBtn:
    "h-10 w-24 rounded bg-emerald-200 border-2 border-emerald-400",
  objectSm: "h-8 w-8 rounded bg-emerald-300 border-2 border-emerald-500",
  tenFrameFilled: "bg-sky-500 border-sky-600",
  tenFrameEmpty: "bg-white border-sky-300",
  numberLineOperand: "text-sky-800 font-bold",
  numberLineTick: "text-slate-500 font-mono",
  groupColor0: "bg-white border-sky-300",
  groupColor1: "bg-sky-300 border-sky-500",
  groupColor2: "bg-amber-200 border-amber-400",
  groupColor3: "bg-emerald-200 border-emerald-400",
  groupColor4: "bg-violet-200 border-violet-400",
  fracNumClass:
    "min-w-[2.75rem] h-10 px-1 text-center text-xl md:text-2xl font-bold rounded-md text-slate-900 bg-sky-100 border-2 border-sky-400",
  fracDenClass:
    "min-w-[2.75rem] h-10 px-1 text-center text-xl md:text-2xl font-bold rounded-md text-slate-900 bg-sky-100 border-2 border-sky-400",
  fracResultClass:
    "min-w-[2.75rem] h-10 px-1 text-center text-xl md:text-2xl font-bold bg-white border-2 border-sky-200 rounded-md text-slate-900",
  fracLine: "border-t-2 border-sky-400",
  operatorSymbol: "text-3xl md:text-4xl font-bold text-slate-800 leading-none select-none",
  decimalDot: "text-slate-700 font-bold",
  ratioTh: "border border-sky-200 px-3 py-1 text-xs text-slate-700 font-medium bg-sky-50",
});
