/**
 * Shared layout vars for learning master pages (--head-h, --game-h).
 * Uses the game wrap's real inner height (after shell padding) instead of window.innerHeight
 * so --game-h matches the flex column and reduces clipping / dead bands on mobile.
 */
export const LEARNING_SHELL_MIN_GAME_H = 260;

/** Space for title + mode row + gaps below the stats strip (conservative). */
export const LEARNING_SHELL_BELOW_CONTROLS_EST = 200;

/** Mode row + gaps below HUD on desktop (title lives in the integrated header). */
export const LEARNING_DESKTOP_BELOW_CONTROLS_EST = 48;

/**
 * @param {{
 *   wrapRef: React.RefObject<HTMLElement | null>,
 *   headerRef: React.RefObject<HTMLElement | null>,
 *   desktopHeaderRef: React.RefObject<HTMLElement | null>,
 *   controlsRef: React.RefObject<HTMLElement | null>,
 * }} refs
 */
export function learningMasterDesktopLayoutOptions({
  wrapRef,
  headerRef,
  desktopHeaderRef,
  controlsRef,
}) {
  const isDesktop =
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 768px)").matches;
  return {
    wrapRef,
    headerRef,
    controlsRef,
    resolveHeadHeight: () =>
      isDesktop
        ? desktopHeaderRef.current?.offsetHeight ?? null
        : headerRef.current?.offsetHeight ?? null,
    belowControlsEst: isDesktop
      ? LEARNING_DESKTOP_BELOW_CONTROLS_EST
      : LEARNING_SHELL_BELOW_CONTROLS_EST,
  };
}

/**
 * @param {{
 *   wrapRef: React.RefObject<HTMLElement | null>,
 *   headerRef: React.RefObject<HTMLElement | null>,
 *   controlsRef: React.RefObject<HTMLElement | null>,
 *   resolveHeadHeight?: () => number | null | undefined,
 *   belowControlsEst?: number,
 * }} refs
 */
export function applyLearningShellLayoutVars({
  wrapRef,
  headerRef,
  controlsRef,
  resolveHeadHeight,
  belowControlsEst,
}) {
  if (typeof window === "undefined") return;
  const wrap = wrapRef?.current;
  if (!wrap) return;

  const resolvedHead = resolveHeadHeight?.();
  const headH =
    (typeof resolvedHead === "number" && resolvedHead > 0
      ? resolvedHead
      : headerRef?.current?.offsetHeight) ?? 56;
  document.documentElement.style.setProperty("--head-h", `${headH}px`);

  const controlsH = controlsRef?.current?.offsetHeight ?? 40;
  const belowEst = belowControlsEst ?? LEARNING_SHELL_BELOW_CONTROLS_EST;
  const avail = wrap.clientHeight;
  const used = headH + controlsH + belowEst;
  const freeH = Math.max(LEARNING_SHELL_MIN_GAME_H, avail - used);
  document.documentElement.style.setProperty("--game-h", `${freeH}px`);
}
