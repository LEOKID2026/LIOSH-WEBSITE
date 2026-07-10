import {
  STUDENT_BRIGHT_PAGE_BG_STYLE,
} from "../student-ui/student-bright-page-background.client.js";

/**
 * Shared loading UI tokens for portal login / gate screens (parent, teacher, student).
 * Bright mode uses the same sky gradient as Layout — not flat white.
 * @param {boolean} isBright
 */
export function getPortalLoadingTheme(isBright) {
  if (isBright) {
    return {
      inlineShell: "py-8 md:py-12 flex flex-col items-center justify-center",
      hubGridShell:
        "col-span-full w-full py-12 flex flex-col items-center justify-center px-4 text-slate-900",
      fullShell:
        "min-h-[100svh] md:min-h-screen flex flex-col items-center justify-center px-4 text-slate-900",
      reportShell:
        "min-h-[60vh] flex flex-col items-center justify-center px-4 text-slate-900",
      pageBackgroundStyle: STUDENT_BRIGHT_PAGE_BG_STYLE,
      spinner:
        "h-12 w-12 rounded-full border-2 border-sky-300 border-t-sky-600 animate-spin mb-4",
      text: "text-slate-800 text-lg font-semibold text-center",
      textSm: "text-slate-600 text-sm font-medium text-center",
    };
  }
  return {
    inlineShell: "py-8 md:py-12 flex flex-col items-center justify-center",
    hubGridShell:
      "col-span-full w-full py-12 flex flex-col items-center justify-center px-4",
    fullShell:
      "min-h-[100svh] md:min-h-screen bg-gradient-to-b from-[#0a0f1d] to-[#141928] flex flex-col items-center justify-center px-4",
    reportShell:
      "min-h-[60vh] flex flex-col items-center justify-center px-4 bg-gradient-to-b from-[#0a0f1d] to-[#141928]",
    pageBackgroundStyle: undefined,
    spinner:
      "h-12 w-12 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin mb-4",
    text: "text-white/90 text-lg font-medium text-center",
    textSm: "text-white/70 text-sm font-medium text-center",
  };
}
