import { useEffect } from "react";

/**
 * Close the topmost open modal on Escape.
 * @param {{ open: boolean, close: () => void }[]} closers — last open entry wins
 */
export function useEscapeCloseModals(closers) {
  useEffect(() => {
    const openClosers = closers.filter((entry) => entry.open);
    if (!openClosers.length) return undefined;
    const active = openClosers[openClosers.length - 1];
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      active.close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closers]);
}
