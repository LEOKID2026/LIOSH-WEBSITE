import { useCallback, useEffect, useRef, useState } from "react";
import StudentRewardCard from "./StudentRewardCard.jsx";
import StudentRewardCardPreviewModal from "./StudentRewardCardPreviewModal.jsx";

/** Same responsive grid as StudentCardsGrid — single grid preserves original card sizing. */
const STUDENT_CARDS_GRID_CLASS =
  "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3 md:gap-4 w-full min-w-0";

function LazyMountGridCell({ children, rootMargin = "480px 0px" }) {
  const ref = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setMounted(entry.isIntersecting);
      },
      { rootMargin, threshold: 0.01 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className="min-h-[240px] h-full min-w-0">
      {mounted ? (
        children
      ) : (
        <div className="min-h-[240px] h-full w-full min-w-0" aria-hidden />
      )}
    </div>
  );
}

/**
 * IO windowing inside one CSS grid — same layout as pre-virtualization StudentCardsGrid.
 */
export default function WindowedStudentCardsGrid({
  items,
  emptyMessage,
  T,
  previewCards,
  studentFullName = "",
  getPreviewAllowDownload,
  renderCardProps,
  gridClassName,
}) {
  const [previewIndex, setPreviewIndex] = useState(null);
  const navigableCards = previewCards ?? items;
  const closePreview = useCallback(() => setPreviewIndex(null), []);

  if (!items.length) {
    return <p className={`text-right py-6 ${T.emptyText}`}>{emptyMessage}</p>;
  }

  const previewCard =
    previewIndex != null && navigableCards[previewIndex] ? navigableCards[previewIndex] : null;
  const previewAllowDownload =
    previewCard && getPreviewAllowDownload
      ? getPreviewAllowDownload(previewCard, previewIndex)
      : false;

  return (
    <>
      <div className={gridClassName || STUDENT_CARDS_GRID_CLASS} data-testid="windowed-student-cards-grid">
        {items.map((card, index) => (
          <LazyMountGridCell key={card.id}>
            <StudentRewardCard
              card={card}
              T={T}
              previewCards={navigableCards}
              previewIndex={index}
              studentFullName={studentFullName}
              suppressPreviewModal
              onPreviewRequest={() => setPreviewIndex(index)}
              {...renderCardProps(card, index)}
            />
          </LazyMountGridCell>
        ))}
      </div>

      {previewIndex != null ? (
        <StudentRewardCardPreviewModal
          open
          cards={navigableCards}
          initialIndex={previewIndex}
          T={T}
          onClose={closePreview}
          allowDownload={previewAllowDownload}
          studentFullName={studentFullName}
        />
      ) : null}
    </>
  );
}
