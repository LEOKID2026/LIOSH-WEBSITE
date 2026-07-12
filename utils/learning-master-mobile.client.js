import {
  applyLearningShellLayoutVars,
  learningMasterDesktopLayoutOptions,
  LEARNING_DESKTOP_BELOW_CONTROLS_EST,
} from "./learning-shell-layout";

/** Mobile-only: subtitle + mode row below HUD (title lives in nav). */
export const LEARNING_MASTER_MOBILE_SHELL_BELOW_CONTROLS_EST = 100;

export const LEARNING_MASTER_MOBILE_WRAP_CLASS =
  "relative overflow-hidden game-page-mobile learning-master-fill flex flex-col flex-1 min-h-0 w-full max-md:pl-0 max-md:pr-0 md:pl-[clamp(8px,2vw,32px)] md:pr-[clamp(8px,2vw,32px)] max-md:pt-0 pt-[clamp(12px,3vw,32px)] md:pt-1";

export const LEARNING_MASTER_MOBILE_CONTENT_SCROLL_CLASS =
  "relative flex flex-1 min-h-0 flex-col items-center justify-start px-2 md:px-4 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch] max-md:pt-[var(--head-h,56px)] md:pt-0";

export const LEARNING_MASTER_MOBILE_SUBTITLE_ROW_CLASS =
  "md:hidden text-center max-md:mb-1.5 mb-3 max-md:-mt-0.5";

export const LEARNING_MASTER_MOBILE_HUD_CLASS = "max-md:!mb-1.5 md:!mb-1.5";

export const LEARNING_MASTER_MOBILE_MODE_ROW_CLASS =
  "mx-auto flex items-center justify-center gap-1 md:gap-2 lg:gap-2.5 max-md:mb-1.5 mb-3 md:mb-1 w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-5xl flex-wrap px-1 md:px-2";

export const LEARNING_MASTER_MOBILE_GAME_CLASS =
  "relative w-full max-w-lg md:max-w-3xl lg:max-w-4xl xl:max-w-4xl flex flex-col flex-1 min-h-0 items-stretch max-md:mb-0 mb-2 mx-auto overflow-hidden max-md:h-[var(--game-h,400px)] max-md:min-h-[300px] md:min-h-[280px]";

export const LEARNING_MASTER_MOBILE_ANSWER_SCALE_CLASS =
  "max-md:scale-100 md:scale-[0.8] origin-top";

export const LEARNING_MASTER_MOBILE_BOOK_TILE_BOTTOM =
  "bottom-[11rem] max-[420px]:bottom-[13rem] max-[380px]:bottom-[14rem]";

/** Mobile numeric answer + shared VK styling (math / geometry). */
export const LEARNING_MASTER_MOBILE_NUMERIC_INPUT =
  "w-full min-h-[56px] h-[58px] max-h-[60px] px-3 py-0 rounded-xl bg-white border-2 border-sky-500 text-slate-900 text-2xl font-semibold text-center leading-none tabular-nums placeholder:text-slate-400 placeholder:font-normal disabled:opacity-50 disabled:bg-slate-100 [appearance:textfield] shadow-inner shadow-sky-100 ring-2 ring-sky-200/80";

export const LEARNING_MASTER_MOBILE_VK_KEY =
  "min-h-[50px] h-[50px] max-[420px]:min-h-[44px] max-[420px]:h-11 rounded-lg border-2 border-sky-400 bg-white text-slate-900 text-lg max-[420px]:text-sm font-bold tabular-nums leading-none active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed hover:border-sky-500 hover:bg-sky-50 transition-transform shadow-sm";

export const LEARNING_MASTER_MOBILE_VK_SUBMIT_GREEN =
  "col-span-3 min-h-[50px] h-[50px] max-[420px]:min-h-[44px] max-[420px]:h-11 rounded-lg border-2 border-emerald-600 bg-emerald-500 text-white text-base max-[420px]:text-sm font-bold leading-none active:scale-[0.98] disabled:opacity-40 hover:bg-emerald-600 transition-transform shadow-sm";

export const LEARNING_MASTER_MOBILE_VK_SUBMIT_BLUE =
  "col-span-3 min-h-[50px] h-[50px] max-[420px]:min-h-[44px] max-[420px]:h-11 rounded-lg border-2 border-cyan-600 bg-cyan-500 text-white text-base max-[420px]:text-sm font-bold leading-none active:scale-[0.98] disabled:opacity-40 hover:bg-cyan-600 transition-transform shadow-sm";

export const LEARNING_MASTER_MOBILE_VK_CLEAR =
  "min-h-[50px] h-[50px] max-[420px]:min-h-[44px] max-[420px]:h-11 rounded-lg border-2 border-rose-600 bg-rose-500 text-white text-lg max-[420px]:text-sm font-bold leading-none active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-rose-600 hover:border-rose-700 transition-transform shadow-sm";

export const LEARNING_MASTER_MOBILE_VK_SPACER = "h-[50px] max-[420px]:h-11";

export const LEARNING_MASTER_MOBILE_VK_ROW_GAP = "gap-0";

export const LEARNING_MASTER_MOBILE_VK_KEYBOARD_SHELL = "!mt-0 !p-0";

/** @param {boolean} isMobileViewport */
export function buildLearningMasterMobileNumericFieldProps(isMobileViewport) {
  if (!isMobileViewport) return {};
  return {
    inputClassName: LEARNING_MASTER_MOBILE_NUMERIC_INPUT,
    className: "!gap-0",
    embeddedKeyClassName: LEARNING_MASTER_MOBILE_VK_KEY,
    embeddedActionKeyClassName: LEARNING_MASTER_MOBILE_VK_KEY,
    embeddedClearKeyClassName: LEARNING_MASTER_MOBILE_VK_CLEAR,
    embeddedSubmitGreenClassName: LEARNING_MASTER_MOBILE_VK_SUBMIT_GREEN,
    embeddedSubmitBlueClassName: LEARNING_MASTER_MOBILE_VK_SUBMIT_BLUE,
    embeddedSpacerClassName: LEARNING_MASTER_MOBILE_VK_SPACER,
    embeddedRowGapClassName: LEARNING_MASTER_MOBILE_VK_ROW_GAP,
    embeddedColGapClassName: LEARNING_MASTER_MOBILE_VK_ROW_GAP,
    embeddedKeyboardClassName: LEARNING_MASTER_MOBILE_VK_KEYBOARD_SHELL,
  };
}

/** Larger mobile typing field for text-answer subjects. */
export const LEARNING_MASTER_MOBILE_TYPING_INPUT_CLASS =
  "w-full min-h-[52px] h-[52px] max-[420px]:min-h-[48px] max-[420px]:h-12 px-3 py-0 rounded-xl bg-white border-2 border-sky-500 text-slate-900 text-xl max-[420px]:text-lg font-semibold text-center leading-none placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-100 shadow-inner shadow-sky-100 ring-2 ring-sky-200/80";

/**
 * @param {{
 *   wrapRef: import("react").RefObject<HTMLElement | null>,
 *   headerRef: import("react").RefObject<HTMLElement | null>,
 *   desktopHeaderRef: import("react").RefObject<HTMLElement | null>,
 *   controlsRef: import("react").RefObject<HTMLElement | null>,
 * }} refs
 */
export function buildLearningMasterMobileShellLayoutOptions(refs) {
  const isDesktop =
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 768px)").matches;
  return {
    ...learningMasterDesktopLayoutOptions(refs),
    belowControlsEst: isDesktop
      ? LEARNING_DESKTOP_BELOW_CONTROLS_EST
      : LEARNING_MASTER_MOBILE_SHELL_BELOW_CONTROLS_EST,
  };
}

/** @param {Parameters<typeof buildLearningMasterMobileShellLayoutOptions>[0]} refs */
export function applyLearningMasterMobileShellLayoutVars(refs) {
  applyLearningShellLayoutVars(buildLearningMasterMobileShellLayoutOptions(refs));
}
