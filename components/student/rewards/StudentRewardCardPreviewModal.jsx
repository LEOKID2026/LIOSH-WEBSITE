import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";
import RewardCardLockedStamp, { lockedCardDimClassName } from "./RewardCardLockedStamp.jsx";
import { downloadStudentRewardCardImage } from "../../../lib/rewards/download-student-card.client.js";

const CAPTION_CLASS =
  "font-bold text-base sm:text-lg leading-snug text-[#FFE8A3] [text-shadow:0_1px_4px_rgba(0,0,0,0.85)]";
const SUB_CAPTION_CLASS =
  "text-sm text-[#FFE8A3]/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]";
const SWIPE_THRESHOLD_PX = 48;

/**
 * Enlarged card preview — overlay only, swipe/arrows within tab card list.
 */
export default function StudentRewardCardPreviewModal({
  open,
  card,
  cards: cardsProp,
  initialIndex = 0,
  T,
  onClose,
  allowDownload = false,
  studentFullName = "",
}) {
  const { homeModalShell } = useStudentTheme();
  const titleId = useId();
  const closeRef = useRef(null);
  const touchStartX = useRef(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const cards = cardsProp?.length ? cardsProp : card ? [card] : [];
  const safeIndex = cards.length ? Math.min(Math.max(activeIndex, 0), cards.length - 1) : 0;
  const currentCard = cards[safeIndex] ?? null;
  const canPrev = safeIndex > 0;
  const canNext = safeIndex < cards.length - 1;

  const goPrev = useCallback(() => {
    setActiveIndex((i) => Math.max(0, i - 1));
    setDownloadError("");
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((i) => Math.min(cards.length - 1, i + 1));
    setDownloadError("");
  }, [cards.length]);

  useEffect(() => {
    if (!open) {
      setDownloadBusy(false);
      setDownloadError("");
      return undefined;
    }
    setActiveIndex(initialIndex);
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveIndex((i) => Math.min(cards.length - 1, i + 1));
        setDownloadError("");
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        setDownloadError("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, initialIndex, cards.length]);

  if (!open || !currentCard) return null;

  const imageSrc = currentCard.imageUrl || "/rewards/cards/placeholders/regular/default.svg";
  const showLocked = currentCard.isLocked === true || currentCard.showLockedStamp === true;
  const canDownload =
    allowDownload &&
    !showLocked &&
    currentCard.owned !== false &&
    Boolean(String(studentFullName ?? "").length);

  const handleDownload = async () => {
    if (!canDownload || downloadBusy) return;
    setDownloadBusy(true);
    setDownloadError("");
    try {
      await downloadStudentRewardCardImage({
        imageUrl: imageSrc,
        studentFullName: String(studentFullName),
        cardNameHe: currentCard.nameHe,
        cardKey: currentCard.cardKey,
      });
    } catch {
      setDownloadError("לא הצלחנו להוריד את הקלף. נסו שוב.");
    } finally {
      setDownloadBusy(false);
    }
  };

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current == null || cards.length < 2) return;
    const endX = event.changedTouches[0]?.clientX;
    if (endX == null) return;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
    if (delta < 0 && canNext) goNext();
    else if (delta > 0 && canPrev) goPrev();
  };

  const navBtnClass =
    "hidden md:inline-flex shrink-0 items-center justify-center rounded-lg border border-white/20 bg-black/35 text-[#FFE8A3] text-2xl leading-none min-h-11 min-w-11 hover:bg-black/50 disabled:opacity-30 disabled:pointer-events-none transition";

  return (
    <div
      className={`${homeModalShell.overlay} !items-center !justify-center p-2 overflow-y-auto overflow-x-hidden`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className="relative flex flex-col items-center gap-2 sm:gap-3 max-w-full min-w-0 bg-transparent p-0 m-0 touch-pan-y"
        onClick={(event) => event.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-center gap-1 sm:gap-2 max-w-full min-w-0">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canPrev}
            className={navBtnClass}
            aria-label="קלף קודם"
          >
            ‹
          </button>

          <div
            className="relative bg-transparent p-0 m-0 w-fit max-w-full"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
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
              alt={currentCard.nameHe || "תמונת קלף"}
              className={`block max-w-full max-h-[80vh] w-auto h-auto object-contain select-none ${
                showLocked ? lockedCardDimClassName(false) : ""
              }`}
              draggable={false}
            />
            {showLocked ? (
              <div className="absolute inset-0 pointer-events-none">
                <RewardCardLockedStamp />
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={goNext}
            disabled={!canNext}
            className={navBtnClass}
            aria-label="קלף הבא"
          >
            ›
          </button>
        </div>

        <div className="max-w-full min-w-0 text-center space-y-1 px-1">
          <h2 id={titleId} className={CAPTION_CLASS}>
            {currentCard.nameHe}
          </h2>
          {currentCard.rarityHe ? (
            <p className={SUB_CAPTION_CLASS}>נדירות: {currentCard.rarityHe}</p>
          ) : null}
          {currentCard.seriesNameHe ? (
            <p className={`truncate ${SUB_CAPTION_CLASS}`}>סדרה: {currentCard.seriesNameHe}</p>
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
              <p className={`text-xs text-center ${SUB_CAPTION_CLASS}`}>{downloadError}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
