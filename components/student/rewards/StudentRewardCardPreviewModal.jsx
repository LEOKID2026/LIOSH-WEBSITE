import { useEffect, useId, useRef, useState } from "react";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";
import RewardCardLockedStamp, { lockedCardDimClassName } from "./RewardCardLockedStamp.jsx";
import { downloadStudentRewardCardImage } from "../../../lib/rewards/download-student-card.client.js";

/**
 * Enlarged card image preview — card sits directly on dark overlay, no panel behind image.
 */
export default function StudentRewardCardPreviewModal({
  open,
  card,
  T,
  onClose,
  allowDownload = false,
  studentFullName = "",
}) {
  const { homeModalShell } = useStudentTheme();
  const titleId = useId();
  const closeRef = useRef(null);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    if (!open) {
      setDownloadBusy(false);
      setDownloadError("");
      return undefined;
    }
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
  const showLocked = card.isLocked === true || card.showLockedStamp === true;
  const canDownload =
    allowDownload && !showLocked && Boolean(String(studentFullName ?? "").length);

  const handleDownload = async () => {
    if (!canDownload || downloadBusy) return;
    setDownloadBusy(true);
    setDownloadError("");
    try {
      await downloadStudentRewardCardImage({
        imageUrl: imageSrc,
        studentFullName: String(studentFullName),
        cardNameHe: card.nameHe,
        cardKey: card.cardKey,
      });
    } catch {
      setDownloadError("לא הצלחנו להוריד את הקלף. נסו שוב.");
    } finally {
      setDownloadBusy(false);
    }
  };

  return (
    <div
      className={`${homeModalShell.overlay} !items-center !justify-center p-2 overflow-y-auto overflow-x-hidden`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="relative flex flex-col items-center gap-2 sm:gap-3 max-w-full min-w-0 bg-transparent p-0 m-0"
        onClick={(event) => event.stopPropagation()}
        dir="rtl"
      >
        <div className="relative bg-transparent p-0 m-0 w-fit max-w-full">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={`absolute -top-2 -left-2 z-20 ${homeModalShell.closeBtn}`}
            style={{ direction: "ltr" }}
            aria-label="סגור"
          >
            ×
          </button>
          <img
            src={imageSrc}
            alt={card.nameHe || "תמונת קלף"}
            className={`block max-w-full max-h-[80vh] w-auto h-auto object-contain ${
              showLocked ? lockedCardDimClassName(false) : ""
            }`}
          />
          {showLocked ? (
            <div className="absolute inset-0 pointer-events-none">
              <RewardCardLockedStamp />
            </div>
          ) : null}
        </div>

        <div className="max-w-full min-w-0 text-center space-y-1 px-1">
          <h2
            id={titleId}
            className="font-bold text-base sm:text-lg leading-snug text-white drop-shadow-sm"
          >
            {card.nameHe}
          </h2>
          {card.rarityHe ? (
            <p className="text-sm text-white/85 drop-shadow-sm">נדירות: {card.rarityHe}</p>
          ) : null}
          {card.seriesNameHe ? (
            <p className="text-sm truncate text-white/85 drop-shadow-sm">סדרה: {card.seriesNameHe}</p>
          ) : null}
        </div>

        {canDownload ? (
          <div className="max-w-full min-w-0 flex flex-col gap-1.5 px-1">
            <button
              type="button"
              disabled={downloadBusy}
              onClick={() => void handleDownload()}
              className={`${T.ctaSecondary} text-sm w-full max-w-xs disabled:opacity-50`}
            >
              {downloadBusy ? "מוריד..." : "הורד את הקלף שלי"}
            </button>
            {downloadError ? (
              <p className="text-xs text-center text-white/80 drop-shadow-sm">{downloadError}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
