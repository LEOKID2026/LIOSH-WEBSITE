/**
 * Verify Grade 1 Science learning book runtime integration.
 * Run: node scripts/verify-science-g1-book.mjs
 */
import {
  getLearningBookEntry,
  getLearningBookIndexHref,
} from "../lib/learning-book/learning-book-catalog.js";
import {
  getLearningBookMasterPath,
  getLearningBookTileTitle,
} from "../lib/learning-book/learning-book-catalog-meta.js";
import {
  SCIENCE_G1_PAGE_ORDER,
  SCIENCE_G1_BOOK_META,
} from "../lib/learning-book/science-g1-registry.js";

const errors = [];

function fail(msg) {
  errors.push(msg);
}

const entry = getLearningBookEntry("science", "g1");
if (!entry) fail("missing science/g1 catalog entry");
if (entry?.status !== "authored") fail("science/g1 must be authored");
if (entry?.meta?.bookTitleHe !== "ספר מדעים — כיתה א׳") {
  fail(`science/g1 bookTitleHe mismatch: ${entry?.meta?.bookTitleHe}`);
}
if (entry?.meta?.routeBase !== "/learning/book/science/g1") {
  fail(`science/g1 routeBase mismatch: ${entry?.meta?.routeBase}`);
}
if (entry?.registry.pageOrder.length !== 6) {
  fail(`science/g1 expected 6 pages, got ${entry?.registry.pageOrder.length}`);
}
if (JSON.stringify(entry?.registry.pageOrder) !== JSON.stringify(SCIENCE_G1_PAGE_ORDER)) {
  fail("science/g1 page order mismatch vs registry");
}
if (entry?.features?.practice !== true) {
  fail("science/g1 must enable practice feature");
}
if (getLearningBookIndexHref("science", "g1") !== SCIENCE_G1_BOOK_META.routeBase) {
  fail("science/g1 index href mismatch");
}
if (getLearningBookMasterPath("science") !== "/learning/science-master") {
  fail("science master path must be /learning/science-master");
}

const tile = getLearningBookTileTitle("science", "g1");
if (tile.line1 !== "ספר מדעים" || tile.line2 !== "כיתה א׳") {
  fail(`science/g1 tile title mismatch: ${JSON.stringify(tile)}`);
}

for (const pageId of SCIENCE_G1_PAGE_ORDER) {
  if (!entry.registry.isValidPageId(pageId)) {
    fail(`science/g1 invalid page id in registry: ${pageId}`);
  }
  const page = entry.loader.loadPage(pageId);
  if (!page) {
    fail(`science/g1 could not load page: ${pageId}`);
    continue;
  }
  if (page.sections?.length !== 7) {
    fail(`science/g1/${pageId}: expected 7 sections, got ${page.sections?.length}`);
  }
  const visible = JSON.stringify(page);
  if (visible.includes("[DRAFT")) {
    fail(`science/g1/${pageId}: visible DRAFT marker in parsed page`);
  }
  if (page.displayTitle?.includes("[DRAFT")) {
    fail(`science/g1/${pageId}: DRAFT in displayTitle`);
  }
  if (page.metadata?.subject !== "science") {
    fail(`science/g1/${pageId}: metadata subject must be science`);
  }
  if (page.metadata?.approval_status !== "draft") {
    fail(`science/g1/${pageId}: source approval_status must remain draft`);
  }
}

const batches = entry.loader.loadTocEntries();
if (batches.length !== 2) {
  fail(`science/g1 expected 2 TOC batches, got ${batches.length}`);
}
const tocPages = batches.flatMap((b) => b.pages.map((p) => p.pageId));
if (JSON.stringify(tocPages) !== JSON.stringify(SCIENCE_G1_PAGE_ORDER)) {
  fail("science/g1 TOC page order mismatch");
}

if (errors.length) {
  console.error(
    "G1 Science runtime verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}

console.log("G1 Science runtime verification PASSED.");
console.log("- catalog entry authored, 6 pages, dynamic route /learning/book/science/g1");
console.log("- practice feature enabled (topic mappings)");
console.log("- all pages load with 7 sections; draft metadata preserved in source");
