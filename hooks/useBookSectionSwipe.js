import { useRef, useCallback } from "react";

const SWIPE_MIN_PX = 52;
const HORIZONTAL_RATIO = 1.35;

/**
 * Horizontal swipe for book section navigation (mobile, RTL-aligned).
 * Swipe left → previous section; swipe right → next section.
 * Ignored when gesture is mostly vertical.
 *
 * @param {{ onPrev: () => void, onNext: () => void, enabled?: boolean }} opts
 */
export function useBookSectionSwipe({ onPrev, onNext, enabled = true }) {
  const startRef = useRef({ x: 0, y: 0 });

  const onTouchStart = useCallback((e) => {
    const t = e.touches[0];
    if (!t) return;
    startRef.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e) => {
      if (!enabled) return;
      const t = e.changedTouches[0];
      if (!t) return;

      const dx = t.clientX - startRef.current.x;
      const dy = t.clientY - startRef.current.y;

      if (Math.abs(dx) < SWIPE_MIN_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_RATIO) return;

      if (dx < 0) {
        onPrev();
      } else {
        onNext();
      }
    },
    [enabled, onNext, onPrev]
  );

  return { onTouchStart, onTouchEnd };
}
