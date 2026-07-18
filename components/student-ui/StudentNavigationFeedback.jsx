import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

const DEFAULT_DELAY_MS = 600;

/**
 * Centered loading text during slow route navigation only.
 * @param {{ cancelRef?: import("react").MutableRefObject<(() => void) | null>, delayMs?: number }} props
 */
export default function StudentNavigationFeedback({ cancelRef, delayMs = DEFAULT_DELAY_MS }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const navigatingRef = useRef(false);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const hide = () => {
      navigatingRef.current = false;
      clearTimer();
      setVisible(false);
    };

    const showDelayed = () => {
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        if (navigatingRef.current) setVisible(true);
      }, delayMs);
    };

    const onStart = () => {
      navigatingRef.current = true;
      setVisible(false);
      showDelayed();
    };

    if (cancelRef) {
      cancelRef.current = hide;
    }

    router.events.on("routeChangeStart", onStart);
    router.events.on("routeChangeComplete", hide);
    router.events.on("routeChangeError", hide);

    return () => {
      if (cancelRef) cancelRef.current = null;
      router.events.off("routeChangeStart", onStart);
      router.events.off("routeChangeComplete", hide);
      router.events.off("routeChangeError", hide);
      hide();
    };
  }, [router.events, cancelRef, delayMs]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center"
      aria-live="polite"
      aria-busy="true"
      data-testid="student-navigation-feedback"
    >
      <p className="text-base font-semibold text-slate-800 drop-shadow-sm">טוען...</p>
    </div>
  );
}
