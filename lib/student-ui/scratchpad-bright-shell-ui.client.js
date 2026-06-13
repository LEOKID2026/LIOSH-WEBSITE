/**
 * Bright-mode scratchpad panel shell — all scratchpad types.
 * Background/envelope only; workspace cells stay on classic styling unless overridden per-type.
 */

/** Soft teal/mint panel fill — aligned with STUDENT_BRIGHT_PAGE_BACKGROUND, no pure white. */
const SCRATCHPAD_BRIGHT_PANEL_FILL =
  "bg-[radial-gradient(circle_at_88%_0%,rgba(14,165,233,0.22),transparent_38%),radial-gradient(circle_at_12%_100%,rgba(45,212,191,0.18),transparent_42%),linear-gradient(180deg,#C5E8FF_0%,#D8F2FF_52%,#d6fff6_100%)]";

export const SCRATCHPAD_BRIGHT_SHELL = Object.freeze({
  panelShellOverlay: `rounded-xl border-2 border-sky-200/90 ${SCRATCHPAD_BRIGHT_PANEL_FILL} shadow-xl shadow-sky-200/35 ring-1 ring-sky-200/45`,
  panelShellInline: `rounded-xl border-2 border-sky-200/90 ${SCRATCHPAD_BRIGHT_PANEL_FILL} ring-1 ring-sky-200/45`,
  panelHeader:
    "shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-b border-sky-200/80 bg-[linear-gradient(180deg,rgba(214,255,246,0.96),rgba(196,244,255,0.92))]",
  panelTitle: "text-sm md:text-base font-semibold text-sky-900",
  panelCloseBtn:
    "px-3 py-1.5 text-xs md:text-sm rounded-lg bg-white text-sky-800 hover:bg-sky-50 border border-sky-300 shadow-sm font-semibold",
  panelLeadStrip:
    "shrink-0 px-3 py-2 border-b border-sky-200/70 bg-[linear-gradient(180deg,rgba(196,244,255,0.72),rgba(214,255,246,0.55))]",
  panelLeadText: "text-sm md:text-base text-center text-slate-800 break-words",
  panelBody:
    "flex-1 min-h-0 w-full overflow-y-auto overscroll-contain touch-pan-y flex flex-col items-center justify-start px-2 py-2 md:px-4 md:py-3 bg-transparent",
});
