import { useEffect, useId, useRef } from "react";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";

/**
 * Enlarged card image preview — image click only; RTL Hebrew metadata.
 */
export default function StudentRewardCardPreviewModal({ open, card, T, onClose }) {
  const { homeModalShell } = useStudentTheme();
  const titleId = useId();
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !card) return null;

  const imageSrc = card.imageUrl || "/rewards/cards/placeholders/regular/default.svg";

  return (
    <div
      className={`${homeModalShell.overlay} !items-center !justify-center p-3 sm:p-4 overflow-y-auto overflow-x-hidden`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={`${homeModalShell.panel} w-full max-w-[min(100%,22rem)] sm:max-w-md md:max-w-lg max-h-[92vh] overflow-y-auto overflow-x-hidden`}
        onClick={(event) => event.stopPropagation()}
        dir="rtl"
      >
        <div className="relative flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 pt-12 min-w-0 w-full">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={`absolute top-2 left-2 z-10 ${homeModalShell.closeBtn}`}
            style={{ direction: "ltr" }}
            aria-label="סגור"
          >
            ×
          </button>

          <img
            src={imageSrc}
            alt={card.nameHe || "תמונת קלף"}
            className="w-full max-w-full max-h-[55vh] sm:max-h-[65vh] md:max-h-[78vh] object-contain rounded-lg bg-slate-100/80 dark:bg-white/5"
          />

          <div className="w-full min-w-0 text-center space-y-1">
            <h2 id={titleId} className={`font-bold text-base sm:text-lg leading-snug ${T.subjectTitle}`}>
              {card.nameHe}
            </h2>
            {card.rarityHe ? (
              <p className={`text-sm ${T.tileSub}`}>נדירות: {card.rarityHe}</p>
            ) : null}
            {card.seriesNameHe ? (
              <p className={`text-sm truncate ${T.tileSub}`}>סדרה: {card.seriesNameHe}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
