import { useRef, useEffect, useCallback } from "react";
import {
  LEARNING_WRONG_ANSWER_FEEDBACK_MS,
  shouldPauseWrongAnswerAutoAdvance,
} from "../utils/learning-wrong-answer-feedback-timing";

/**
 * Wrong-answer auto-advance timer shared by learning subject masters.
 * @param {boolean} showSolution
 * @param {boolean} showPreviousSolution
 */
export function useLearningWrongAnswerAdvance(showSolution, showPreviousSolution) {
  const timerRef = useRef(null);
  const callbackRef = useRef(null);
  const pendingRef = useRef(false);
  const showSolutionRef = useRef(showSolution);
  const showPreviousSolutionRef = useRef(showPreviousSolution);

  useEffect(() => {
    showSolutionRef.current = showSolution;
  }, [showSolution]);

  useEffect(() => {
    showPreviousSolutionRef.current = showPreviousSolution;
  }, [showPreviousSolution]);

  const clearWrongAnswerAdvanceTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearWrongAnswerAdvanceState = useCallback(() => {
    clearWrongAnswerAdvanceTimer();
    pendingRef.current = false;
    callbackRef.current = null;
  }, [clearWrongAnswerAdvanceTimer]);

  const scheduleWrongAnswerAdvance = useCallback(
    (callback) => {
      clearWrongAnswerAdvanceTimer();
      pendingRef.current = true;
      callbackRef.current = callback;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (
          shouldPauseWrongAnswerAutoAdvance({
            showSolution: showSolutionRef.current,
            showPreviousSolution: showPreviousSolutionRef.current,
          })
        ) {
          return;
        }
        pendingRef.current = false;
        callbackRef.current = null;
        callback();
      }, LEARNING_WRONG_ANSWER_FEEDBACK_MS);
    },
    [clearWrongAnswerAdvanceTimer]
  );

  useEffect(() => {
    if (shouldPauseWrongAnswerAutoAdvance({ showSolution, showPreviousSolution })) {
      clearWrongAnswerAdvanceTimer();
      return;
    }
    if (
      pendingRef.current &&
      callbackRef.current &&
      timerRef.current == null
    ) {
      const callback = callbackRef.current;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (
          shouldPauseWrongAnswerAutoAdvance({
            showSolution: showSolutionRef.current,
            showPreviousSolution: showPreviousSolutionRef.current,
          })
        ) {
          return;
        }
        pendingRef.current = false;
        callbackRef.current = null;
        callback();
      }, LEARNING_WRONG_ANSWER_FEEDBACK_MS);
    }
  }, [showSolution, showPreviousSolution, clearWrongAnswerAdvanceTimer]);

  useEffect(() => () => clearWrongAnswerAdvanceTimer(), [clearWrongAnswerAdvanceTimer]);

  return {
    scheduleWrongAnswerAdvance,
    clearWrongAnswerAdvanceTimer,
    clearWrongAnswerAdvanceState,
    wrongAnswerPendingRef: pendingRef,
  };
}
