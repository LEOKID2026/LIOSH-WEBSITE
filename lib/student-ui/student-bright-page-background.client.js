/**
 * Shared bright-mode page background — all student pilot / learning / games hub screens.
 * Apply via inline style; pair with layout classes that omit Tailwind bg-gradient.
 */

export const STUDENT_BRIGHT_PAGE_BACKGROUND =
  "radial-gradient(circle at top right, rgba(14, 165, 233, 0.32), transparent 38%), radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.26), transparent 40%), linear-gradient(180deg, #C5E8FF 0%, #D8F2FF 50%, #BFE3FF 100%)";

export const STUDENT_BRIGHT_PAGE_BG_STYLE = Object.freeze({
  background: STUDENT_BRIGHT_PAGE_BACKGROUND,
});

/** Learning master outer shell (immersive full viewport). */
export const STUDENT_BRIGHT_MASTER_SHELL_LAYOUT =
  "flex flex-col h-dvh max-h-dvh min-h-0 overflow-hidden";

/** Site-wide bright Layout header + footer strip (background only). */
export const STUDENT_BRIGHT_SITE_CHROME_BG =
  "bg-[linear-gradient(180deg,rgba(214,255,246,0.96),rgba(196,244,255,0.92))]";

/** @param {boolean} isBright */
export function studentBrightPageBgStyle(isBright) {
  return isBright ? STUDENT_BRIGHT_PAGE_BG_STYLE : undefined;
}
