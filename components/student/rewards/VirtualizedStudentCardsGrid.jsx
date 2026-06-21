import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import StudentRewardCard from "./StudentRewardCard.jsx";
import StudentRewardCardPreviewModal from "./StudentRewardCardPreviewModal.jsx";

/** Same responsive grid as StudentCardsGrid — keep in sync. */
export const STUDENT_CARDS_GRID_CLASS =
  "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3 md:gap-4 w-full min-w-0";

function getColumnCount(viewportWidth) {
  if (viewportWidth >= 1280) return 6;
  if (viewportWidth >= 1024) return 5;
  if (viewportWidth >= 768) return 4;
  if (viewportWidth >= 640) return 3;
  return 2;
}

/**
 * Window-scrolled row virtualization for large card grids (shop / collection / catalog).
 * Renders only visible rows + overscan; preview modal is lifted to grid level.
 */
export default function VirtualizedStudentCardsGrid({
  items,
  emptyMessage,
  T,
  previewCards,
  studentFullName = "",
  estimateRowHeight = 360,
  getPreviewAllowDownload,
  renderCardProps,
}) {
  const listRef = useRef(null);
  const [columnCount, setColumnCount] = useState(2);
  const [scrollMargin, setScrollMargin] = useState(0);
  const [previewIndex, setPreviewIndex] = useState(null);

  useEffect(() => {
    const updateColumns = () => setColumnCount(getColumnCount(window.innerWidth));
    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  useLayoutEffect(() => {
    const updateMargin = () => {
      setScrollMargin(listRef.current?.offsetTop ?? 0);
    };
    updateMargin();
    window.addEventListener("resize", updateMargin);
    return () => window.removeEventListener("resize", updateMargin);
  }, [items.length]);

  const rowCount = Math.ceil(items.length / columnCount) || 0;

  const rows = useMemo(() => {
    const grouped = [];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      const rowItems = [];
      for (let col = 0; col < columnCount; col += 1) {
        const index = rowIndex * columnCount + col;
        if (index < items.length) {
          rowItems.push({ card: items[index], index });
        }
      }
      grouped.push(rowItems);
    }
    return grouped;
  }, [items, columnCount, rowCount]);

  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => estimateRowHeight,
    overscan: 2,
    scrollMargin,
  });

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
      <div ref={listRef} className="w-full min-w-0" data-testid="virtualized-student-cards-grid">
        <div
          className="relative w-full min-w-0"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const rowItems = rows[virtualRow.index] || [];
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className={STUDENT_CARDS_GRID_CLASS}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                }}
              >
                {rowItems.map(({ card, index }) => (
                  <StudentRewardCard
                    key={card.id}
                    card={card}
                    T={T}
                    previewCards={navigableCards}
                    previewIndex={index}
                    studentFullName={studentFullName}
                    suppressPreviewModal
                    onPreviewRequest={() => setPreviewIndex(index)}
                    {...renderCardProps(card, index)}
                  />
                ))}
              </div>
            );
          })}
        </div>
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
