import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tracks page/tab visibility and syncs a QuestionTimeLedger (P1).
 * Does not credit time itself — only calls ledger.onVisible / onHidden.
 *
 * @param {{
 *   enabled?: boolean,
 *   ledger?: import('../utils/learning-time-credit/question-time-ledger.js').QuestionTimeLedger | null,
 * }} options
 */
export function useLearningVisibilityClock({ enabled = true, ledger = null } = {}) {
  const ledgerRef = useRef(ledger);
  ledgerRef.current = ledger;

  const [isVisible, setIsVisible] = useState(true);

  const syncVisibility = useCallback(() => {
    if (typeof document === "undefined") return;
    const visible = document.visibilityState === "visible";
    setIsVisible(visible);
    const active = ledgerRef.current;
    if (!active) return;
    const now = Date.now();
    if (visible) {
      active.onVisible(now);
    } else {
      active.onHidden(now);
    }
  }, []);

  useEffect(() => {
    if (!enabled || typeof document === "undefined") return undefined;

    syncVisibility();

    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("focus", syncVisibility);
    window.addEventListener("blur", syncVisibility);

    return () => {
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("focus", syncVisibility);
      window.removeEventListener("blur", syncVisibility);
    };
  }, [enabled, syncVisibility]);

  return {
    isVisible,
    visibilityState:
      typeof document !== "undefined" ? document.visibilityState : "visible",
  };
}
