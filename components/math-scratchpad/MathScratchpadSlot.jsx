import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { isMathScratchpadV1Enabled } from "../../utils/math-scratchpad/feature-flag";
import { getScratchpadType } from "../../utils/math-scratchpad/scratchpad-registry";
import { extractScratchpadOperands } from "../../utils/math-scratchpad/extract-operands";
import { resolveStudentQuestionDisplayParts } from "../../utils/student-question-display";
import MathScratchpadPanel from "./MathScratchpadPanel";

/**
 * @param {DOMRectReadOnly | DOMRect} topRect — page title / top anchor
 * @param {DOMRectReadOnly | DOMRect} widthRect — content width (stats bar)
 * @param {DOMRectReadOnly | DOMRect} answerRect — top of answer area (overlay bottom)
 */
function measureOverlayRect(topRect, widthRect, answerRect) {
  const top = topRect.top;
  const left = widthRect.left;
  const width = widthRect.width;
  const height = Math.max(0, answerRect.top - topRect.top);
  return { top, left, width, height };
}

/**
 * Floating scratchpad overlay: fixed from page title through stats/tabs/question,
 * down to answer top. Answer / keyboard / bottom controls stay exposed below.
 */
export default function MathScratchpadSlot({
  gradeKey,
  operation,
  question,
  questionKey,
  forceClose = false,
  closeSignal = 0,
  exerciseHeadlineOverride,
  getQuestionFontStyle,
  onOpenChange,
  overlayTopRef,
  overlayWidthRef,
  answerAnchorRef,
  open: openControlled,
  defaultOpen = false,
  hideInlineOpenButton = false,
  preserveQuestionLayout = false,
  openButtonClassName,
  openButtonWrapClassName,
  children,
}) {
  const isControlled = openControlled !== undefined;
  const [openUncontrolled, setOpenUncontrolled] = useState(defaultOpen);
  const open = isControlled ? Boolean(openControlled) : openUncontrolled;
  const [overlayRect, setOverlayRect] = useState(null);
  const [mounted, setMounted] = useState(false);

  const setOpen = useCallback(
    (next) => {
      if (!isControlled) setOpenUncontrolled(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const operands = useMemo(
    () => extractScratchpadOperands(question),
    [question]
  );

  const scratchpadType = useMemo(() => {
    if (!isMathScratchpadV1Enabled()) return null;
    return getScratchpadType(gradeKey, operation, {
      a: operands.a,
      b: operands.b,
    });
  }, [gradeKey, operation, operands.a, operands.b]);

  const displayParts = useMemo(
    () =>
      resolveStudentQuestionDisplayParts({
        question: question?.question,
        questionLabel: question?.questionLabel,
        exerciseText: question?.exerciseText,
      }),
    [question]
  );

  const exerciseHeadline = useMemo(() => {
    if (typeof exerciseHeadlineOverride === "string" && exerciseHeadlineOverride.trim()) {
      return exerciseHeadlineOverride.trim();
    }
    if (displayParts.bodyText) return displayParts.bodyText;
    if (question?.exerciseText) return String(question.exerciseText).trim();
    if (question?.question) return String(question.question).trim();
    return "";
  }, [exerciseHeadlineOverride, displayParts.bodyText, question]);

  const exerciseLead = useMemo(() => {
    if (typeof exerciseHeadlineOverride === "string" && exerciseHeadlineOverride.trim()) {
      return displayParts.leadText || "";
    }
    if (displayParts.bodyText && displayParts.leadText) return displayParts.leadText;
    return "";
  }, [exerciseHeadlineOverride, displayParts.leadText, displayParts.bodyText]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (forceClose && open) setOpen(false);
  }, [forceClose, open, setOpen]);

  useEffect(() => {
    if (isControlled) {
      onOpenChange?.(false);
      return;
    }
    setOpenUncontrolled(defaultOpen);
  }, [questionKey, defaultOpen, isControlled, onOpenChange]);

  useEffect(() => {
    if (closeSignal > 0) setOpen(false);
  }, [closeSignal, setOpen]);

  useLayoutEffect(() => {
    if (!open) {
      setOverlayRect(null);
      return undefined;
    }

    const update = () => {
      const topEl = overlayTopRef?.current;
      const widthEl = overlayWidthRef?.current;
      const answerEl = answerAnchorRef?.current;
      if (!topEl || !widthEl || !answerEl) return;
      setOverlayRect(
        measureOverlayRect(
          topEl.getBoundingClientRect(),
          widthEl.getBoundingClientRect(),
          answerEl.getBoundingClientRect()
        )
      );
    };

    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    window.addEventListener("scroll", update, true);

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(update)
        : null;
    if (ro) {
      if (overlayTopRef?.current) ro.observe(overlayTopRef.current);
      if (overlayWidthRef?.current) ro.observe(overlayWidthRef.current);
      if (answerAnchorRef?.current) {
        ro.observe(answerAnchorRef.current);
        if (answerAnchorRef.current.parentElement) {
          ro.observe(answerAnchorRef.current.parentElement);
        }
      }
    }

    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      window.removeEventListener("scroll", update, true);
      ro?.disconnect();
    };
  }, [open, overlayTopRef, overlayWidthRef, answerAnchorRef, questionKey]);

  const overlayPortal =
    mounted &&
    open &&
    overlayRect &&
    overlayRect.height > 0 &&
    typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed z-[100] flex flex-col pointer-events-auto"
            style={{
              top: overlayRect.top,
              left: overlayRect.left,
              width: overlayRect.width,
              height: overlayRect.height,
            }}
            data-testid="math-scratchpad-overlay-shell"
          >
            <MathScratchpadPanel
              open
              onClose={() => setOpen(false)}
              scratchpadType={scratchpadType}
              operands={operands}
              exerciseHeadline={exerciseHeadline}
              exerciseLead={exerciseLead}
              getQuestionFontStyle={getQuestionFontStyle}
              overlay
            />
          </div>,
          document.body
        )
      : null;

  if (!scratchpadType) {
    return <>{children}</>;
  }

  const questionStageBody =
    preserveQuestionLayout || !open ? (
      <>
        <div
          className={`flex flex-col flex-1 min-h-0 w-full justify-center items-center overflow-hidden ${
            open ? "invisible pointer-events-none" : ""
          }`}
        >
          {children}
        </div>
        {!hideInlineOpenButton && !open ? (
          <div
            className={`shrink-0 flex justify-center py-2 ${openButtonWrapClassName ?? ""}`.trim()}
          >
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={
                openButtonClassName ??
                "px-4 py-2 text-sm rounded-lg bg-white/10 text-white/90 hover:bg-white/15 border border-white/20"
              }
              data-testid="math-scratchpad-open"
            >
              דף טיוטה
            </button>
          </div>
        ) : null}
      </>
    ) : (
      <div
        className="flex-1 min-h-0 w-full"
        aria-hidden="true"
        data-testid="math-scratchpad-placeholder"
      />
    );

  return (
    <>
      {overlayPortal}
      <div
        className="flex flex-col flex-1 min-h-0 w-full h-full"
        data-testid="math-scratchpad-slot"
      >
        {questionStageBody}
      </div>
    </>
  );
}
