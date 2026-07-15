/**
 * Unified reward card tile — same layout in collection, shop, and catalog tabs.
 */
import { Children, useEffect, useRef, useState } from "react";
import StudentRewardCardPreviewModal from "./StudentRewardCardPreviewModal.jsx";
import RewardCardLockedStamp from "./RewardCardLockedStamp.jsx";
import RewardCardImage from "./RewardCardImage.jsx";

export default function StudentRewardCard({
  card,
  T,
  footer,
  showLockedStamp = false,
  allowDownload = false,
  studentFullName = "",
  previewCards,
  previewIndex = 0,
  suppressPreviewModal = false,
  onPreviewRequest,
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewCard = showLockedStamp ? { ...card, showLockedStamp: true } : card;
  const navigableCards = previewCards ?? [previewCard];

  const openPreview = () => {
    if (onPreviewRequest) {
      onPreviewRequest();
      return;
    }
    setPreviewOpen(true);
  };

  return (
    <>
      <article
        data-testid="student-reward-card"
        className={`rounded-xl border shadow-sm p-2.5 sm:p-3 flex flex-col h-full min-h-[240px] text-right overflow-hidden min-w-0 ${T.subjectCard}`}
      >
        <button
          type="button"
          className="relative aspect-[2/3] w-full shrink-0 mb-2 p-0 border-0 bg-transparent cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
          onClick={openPreview}
          aria-label={`הגדלת תמונת הקלף ${card.nameHe || ""}`.trim()}
        >
          <RewardCardImage
            src={card.imageThumbUrl || card.imageUrl || "/rewards/cards/placeholders/regular/default.svg"}
            preBaked={card.imageVariantsReady === true}
            size="tile"
            fit="cover"
            wrapperClassName="w-full h-full"
          >
            {showLockedStamp ? <RewardCardLockedStamp /> : null}
          </RewardCardImage>
        </button>
        <div className="flex flex-col flex-1 gap-1 min-w-0">
          <h3 className={`font-bold text-sm leading-snug line-clamp-2 ${T.subjectTitle}`}>
            {card.nameHe}
          </h3>
          {card.seriesNameHe ? (
            <p className={`text-xs truncate ${T.tileSub}`}>{card.seriesNameHe}</p>
          ) : null}
          {card.rarityHe ? (
            <p className={`text-xs ${T.tileSub}`}>{card.rarityHe}</p>
          ) : null}
          {card.duplicateCount > 0 ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              כפילויות: {card.duplicateCount}
            </p>
          ) : null}
          {footer ? <div className="mt-auto pt-2 flex flex-col gap-2 min-w-0">{footer}</div> : null}
        </div>
      </article>

      {!suppressPreviewModal ? (
        <StudentRewardCardPreviewModal
          open={previewOpen}
          card={previewCard}
          cards={navigableCards}
          initialIndex={previewIndex}
          T={T}
          onClose={() => setPreviewOpen(false)}
          allowDownload={allowDownload}
          studentFullName={studentFullName}
        />
      ) : null}
    </>
  );
}

function VirtualizedSeriesThumb({ card, index, imageSrc, onOpen, keepMounted }) {
  const ref = useRef(null);
  const [mounted, setMounted] = useState(keepMounted);

  useEffect(() => {
    if (keepMounted) {
      setMounted(true);
      return undefined;
    }
    const el = ref.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setMounted(entry.isIntersecting);
      },
      { rootMargin: "240px 0px", threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [keepMounted]);

  return (
    <div
      ref={ref}
      className="relative w-11 sm:w-14 md:w-[4.5rem] aspect-[2/3] shrink-0"
      role="listitem"
    >
      {mounted ? (
        <button
          type="button"
          className="relative w-full h-full p-0 border-0 bg-transparent cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
          onClick={() => onOpen(index)}
          aria-label={
            card.owned ? `הגדלת תמונת הקלף ${card.nameHe}` : `${card.nameHe} - נעול`
          }
        >
          <RewardCardImage
            src={imageSrc}
            preBaked={card.imageVariantsReady === true}
            size="thumb"
            fit="cover"
            wrapperClassName="w-full h-full"
          >
            {!card.owned ? <RewardCardLockedStamp compact /> : null}
          </RewardCardImage>
        </button>
      ) : (
        <div
          className="w-full h-full rounded-md bg-black/[0.04] dark:bg-white/[0.06]"
          aria-hidden
        />
      )}
    </div>
  );
}

/** Series progress with card thumbnails — series tab. */
export function StudentSeriesProgressCard({ series, T, studentFullName = "" }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const pct = series.totalCount > 0 ? Math.round((series.ownedCount / series.totalCount) * 100) : 0;
  const cards = series.cards || [];
  const previewCards = cards.map((c) => (c.owned ? c : { ...c, showLockedStamp: true }));

  return (
    <>
      <article
        className={`rounded-xl border shadow-sm p-3 sm:p-4 flex flex-col min-h-[120px] text-right min-w-0 overflow-hidden ${T.subjectCard}`}
      >
        <div className="flex justify-between items-start gap-2 mb-2 min-w-0">
          <span className={`font-bold text-sm sm:text-base leading-snug min-w-0 ${T.subjectTitle}`}>
            {series.nameHe}
          </span>
          <span className={`text-xs sm:text-sm tabular-nums shrink-0 ${T.tileSub}`}>
            {series.ownedCount} מתוך {series.totalCount}
          </span>
        </div>
        <div className={`${T.progressTrack} w-full`}>
          <div className={T.progressFill} style={{ width: `${pct}%` }} />
        </div>
        <p className={`text-xs mt-2 ${T.tileSub}`}>{pct}% מהסדרה</p>

        {cards.length > 0 ? (
          <div
            className="mt-3 flex flex-wrap gap-1.5 sm:gap-2 w-full min-w-0"
            role="list"
            aria-label={`קלפים בסדרה ${series.nameHe}`}
            data-testid="series-card-thumbs"
          >
            {cards.map((card, index) => {
              const imageSrc =
                card.imageThumbUrl || card.imageUrl || "/rewards/cards/placeholders/regular/default.svg";
              return (
                <VirtualizedSeriesThumb
                  key={card.cardId}
                  card={card}
                  index={index}
                  imageSrc={imageSrc}
                  onOpen={(thumbIndex) => {
                    setPreviewIndex(thumbIndex);
                    setPreviewOpen(true);
                  }}
                  keepMounted={previewOpen && previewIndex === index}
                />
              );
            })}
          </div>
        ) : null}
      </article>

      <StudentRewardCardPreviewModal
        open={previewOpen}
        cards={previewCards}
        initialIndex={previewIndex}
        T={T}
        onClose={() => setPreviewOpen(false)}
        allowDownload
        studentFullName={studentFullName}
      />
    </>
  );
}

/** Shared responsive card grid for collection / shop / catalog. */
export function StudentCardsGrid({ children, emptyMessage, T }) {
  const items = Children.toArray(children);
  if (!items.length) {
    return <p className={`text-right py-6 ${T.emptyText}`}>{emptyMessage}</p>;
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3 md:gap-4 w-full min-w-0">
      {children}
    </div>
  );
}

/** Tab content panel — identical shell for every tab. */
export function StudentCardsTabPanel({ children, T }) {
  return (
    <section
      className={`rounded-xl border p-3 sm:p-4 md:p-5 min-w-0 overflow-hidden ${T.statCard}`}
      aria-live="polite"
    >
      {children}
    </section>
  );
}
