#!/usr/bin/env node
/**
 * Static estimate + architecture notes for student cards grid virtualization (#3).
 * Browser verification (DevTools):
 *   document.querySelectorAll('[data-testid="student-reward-card"]').length
 *
 * Run: node scripts/tests/audit-student-cards-virtualization.mjs
 */

const SHOP_CARDS = 108;
const CATALOG_CARDS = 156;
const SERIES_THUMBS = 156;

const BREAKPOINTS = [
  { min: 1280, cols: 6 },
  { min: 1024, cols: 5 },
  { min: 768, cols: 4 },
  { min: 640, cols: 3 },
  { min: 0, cols: 2 },
];

const ROW_HEIGHTS = { shop: 400, collection: 320, catalog: 360 };
const OVERSCAN_ROWS = 2;
const VIEWPORT_HEIGHT = 800;

function colsForWidth(width) {
  return BREAKPOINTS.find((bp) => width >= bp.min).cols;
}

function estimateRenderedCards(totalCards, cols, rowHeight, viewportHeight) {
  const rowCount = Math.ceil(totalCards / cols);
  const visibleRows = Math.ceil(viewportHeight / rowHeight);
  const renderedRows = Math.min(rowCount, visibleRows + OVERSCAN_ROWS * 2);
  return Math.min(totalCards, renderedRows * cols);
}

function estimateSeriesThumbs(viewportHeight) {
  const thumbsPerSeriesAvg = SERIES_THUMBS / 13;
  const visibleSeriesCards = 3;
  const thumbsPerRow = 6;
  const thumbRowHeight = 72;
  const visibleThumbRows = Math.ceil(viewportHeight / thumbRowHeight);
  const perSeriesVisible = Math.min(
    thumbsPerSeriesAvg,
    (visibleThumbRows + 4) * thumbsPerRow
  );
  return Math.round(visibleSeriesCards * perSeriesVisible);
}

console.log("=== Student Cards Grid Virtualization (#3) ===\n");

console.log("Before (#2 split API, no virtualization):");
console.log(`- Shop tab DOM: ${SHOP_CARDS} StudentRewardCard articles`);
console.log(`- Catalog tab DOM: ${CATALOG_CARDS} articles`);
console.log(`- Series tab DOM: ~${SERIES_THUMBS} thumb images (+ 13 series cards)\n`);

console.log("After (window row virtualizer + series thumb IO):");
for (const width of [390, 768, 1280]) {
  const cols = colsForWidth(width);
  const shopRendered = estimateRenderedCards(SHOP_CARDS, cols, ROW_HEIGHTS.shop, VIEWPORT_HEIGHT);
  const catalogRendered = estimateRenderedCards(
    CATALOG_CARDS,
    cols,
    ROW_HEIGHTS.catalog,
    VIEWPORT_HEIGHT
  );
  console.log(
    `Viewport ${width}px (cols=${cols}), height=${VIEWPORT_HEIGHT}px:` +
      ` shop ~${shopRendered}/${SHOP_CARDS} cards,` +
      ` catalog ~${catalogRendered}/${CATALOG_CARDS} cards`
  );
}

console.log(
  `\nSeries thumbs (IO, rootMargin 240px): ~${estimateSeriesThumbs(VIEWPORT_HEIGHT)}/${SERIES_THUMBS} mounted (estimate)`
);

console.log("\nBrowser checks:");
console.log('- Open /student/cards → shop tab → run: document.querySelectorAll(\'[data-testid="student-reward-card"]\').length');
console.log("- Scroll shop — count should stay bounded (not grow to 108)");
console.log("- Tap card → preview modal opens; swipe between cards works");
console.log("- Purchase / sell duplicate → card state updates after refresh");
console.log("- Mobile 390px: same grid classes, no horizontal overflow");

console.log("\nExpected improvements:");
console.log("- Initial shop paint: fewer DOM nodes → faster layout");
console.log("- Scroll: only ~4-8 rows mounted vs 18+ rows / 108 cards");
console.log("- API payload unchanged (#2); this targets DOM/layout only");

console.log("\naudit-student-cards-virtualization: done");
