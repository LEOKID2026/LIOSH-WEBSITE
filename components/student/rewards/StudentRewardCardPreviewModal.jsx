import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";
import RewardCardLockedStamp, { lockedCardDimClassName } from "./RewardCardLockedStamp.jsx";
import RewardCardImage from "./RewardCardImage.jsx";
import { downloadStudentRewardCardImage } from "../../../lib/rewards/download-student-card.client.js";
import { prefetchRewardCardNeighbors } from "../../../lib/rewards/reward-card-display-prefetch.client.js";

const CARD_THUMB_PLACEHOLDER = "/rewards/cards/placeholders/regular/default.svg";

const CARD_INFO_PILL_CLASS =
  "rounded-full border border-[rgba(255,215,120,0.45)] bg-[rgba(15,23,42,0.55)] backdrop-blur-[3px] " +
  "px-3.5 py-2 text-center shadow-[0_4px_16px_rgba(0,0,0,0.2)]";
const CAPTION_CLASS =
  "text-lg sm:text-xl md:text-2xl leading-snug text-[#FFF8E7] font-extrabold [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]";
const SUB_CAPTION_CLASS =
  "text-xs sm:text-sm leading-snug text-white/90 font-semibold [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]";
const SWIPE_THRESHOLD_PX = 48;

/** Overlay images fill the display-sized frame (thumb upscales inside it). */
const MODAL_OVERLAY_IMG_CLASS =
  "absolute inset-0 w-full h-full object-contain pointer-events-none select-none";

/**
 * Thumb-first modal image inside the original RewardCardImage layout box.
 * Root cause of shrink: sizing the wrapper from thumb.webp (~280px intrinsic).
 * max-h-[80vh] does not upscale — display must define the layout frame.
 */
function StudentRewardCardModalImage({ thumbSrc, displaySrc, alt, showLocked, preBaked }) {
  const [displayReady, setDisplayReady] = useState(false);
  const useDisplayLayer =
    displayReady && Boolean(displaySrc) && displaySrc !== thumbSrc;
  const lockedClass = showLocked ? lockedCardDimClassName(false) : "";

  useEffect(() => {
    setDisplayReady(false);
    const target = String(displaySrc || "").trim();
    if (!target || target === thumbSrc) return undefined;

    let alive = true;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (alive) setDisplayReady(true);
    };
    img.onerror = () => {
      if (alive) setDisplayReady(false);
    };
    img.src = target;

    return () => {
      alive = false;
    };
  }, [displaySrc, thumbSrc]);

  return (
    <div className="relative inline-block max-w-full max-h-[80vh] w-fit bg-transparent">
      {/* Layout sizer - identical to pre-#4 modal (display.webp intrinsic dimensions). */}
      <RewardCardImage
        src={displaySrc}
        preBaked={preBaked}
        size="modal"
        fit="contain"
        loading="eager"
        alt=""
        className="opacity-0 pointer-events-none select-none"
        draggable={false}
      />
      <div className="absolute inset-0 overflow-hidden bg-transparent">
        <img
          src={thumbSrc || CARD_THUMB_PLACEHOLDER}
          alt={alt}
          className={`${MODAL_OVERLAY_IMG_CLASS} transition-opacity duration-200 ${
            useDisplayLayer ? "opacity-0" : "opacity-100"
          } ${lockedClass}`.trim()}
          loading="eager"
          draggable={false}
          decoding="async"
        />
        {useDisplayLayer ? (
          <img
            src={displaySrc}
            alt={alt}
            className={`${MODAL_OVERLAY_IMG_CLASS} opacity-100 ${lockedClass}`.trim()}
            loading="eager"
            draggable={false}
            decoding="async"
          />
        ) : null}
        {showLocked ? <RewardCardLockedStamp modal /> : null}
      </div>
    </div>
  );
}

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

  useEffect(() => {
    if (!open || !cards.length) return undefined;
    prefetchRewardCardNeighbors(cards, safeIndex);
    return undefined;
  }, [open, cards, safeIndex]);

  if (!open || !currentCard) return null;

  const thumbSrc =
    currentCard.imageThumbUrl ||
    currentCard.imageUrl ||
    CARD_THUMB_PLACEHOLDER;
  const displaySrc =
    currentCard.imageDisplayUrl ||
    currentCard.imageUrl ||
    thumbSrc;
  const downloadImageSrc = displaySrc;
  const showLocked = currentCard.isLocked === true || currentCard.showLockedStamp === true;
  const canDownload =
    !showLocked &&
    Boolean(String(studentFullName ?? "").length) &&
    (currentCard.alreadyOwned === true ||
      currentCard.isOwned === true ||
      allowDownload);

  const handleDownload = async () => {
    if (!canDownload || downloadBusy) return;
    setDownloadBusy(true);
    setDownloadError("");
    try {
      await downloadStudentRewardCardImage({
        imageUrl: downloadImageSrc,
        downloadUrl: currentCard.imageDownloadUrl,
        imageVariantsReady: currentCard.imageVariantsReady === true,
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
    // RTL: swipe right → next, swipe left → prev (matches side arrow buttons)
    if (delta > 0 && canNext) goNext();
    else if (delta < 0 && canPrev) goPrev();
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
        <div className="flex flex-col items-center max-w-full min-w-0 gap-1.5">
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
                className="absolute -top-2 -left-2 z-20 inline-flex items-center justify-center rounded-lg border border-white/20 bg-black/35 text-[#FFE8A3] text-2xl leading-none min-h-11 min-w-11 hover:bg-black/50 transition"
                style={{ direction: "ltr" }}
                aria-label="סגור"
              >
                ×
              </button>
              <StudentRewardCardModalImage
                thumbSrc={thumbSrc}
                displaySrc={displaySrc}
                alt={currentCard.nameHe || "תמונת קלף"}
                showLocked={showLocked}
                preBaked={currentCard.imageVariantsReady === true}
              />
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

          <div className={`${CARD_INFO_PILL_CLASS} space-y-1 min-w-0 w-full max-w-full`}>
            <h2 id={titleId} className={`${CAPTION_CLASS} line-clamp-2`}>
              {currentCard.nameHe}
            </h2>
            {currentCard.rarityHe || currentCard.seriesNameHe ? (
              <p className={`${SUB_CAPTION_CLASS} truncate`}>
                {[
                  currentCard.rarityHe ? `נדירות: ${currentCard.rarityHe}` : null,
                  currentCard.seriesNameHe ? `סדרה: ${currentCard.seriesNameHe}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
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
