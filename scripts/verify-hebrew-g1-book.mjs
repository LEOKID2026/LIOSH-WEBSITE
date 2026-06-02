/**
 * Verify Grade 1 Hebrew learning book runtime integration.
 * Run: node scripts/verify-hebrew-g1-book.mjs
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
  HEBREW_G1_PAGE_ORDER,
  HEBREW_G1_BOOK_META,
} from "../lib/learning-book/hebrew-g1-registry.js";

const errors = [];

function fail(msg) {
  errors.push(msg);
}

const entry = getLearningBookEntry("hebrew", "g1");
if (!entry) fail("missing hebrew/g1 catalog entry");
if (entry?.status !== "authored") fail("hebrew/g1 must be authored");
if (entry?.meta?.bookTitleHe !== "ספר עברית — כיתה א׳") {
  fail(`hebrew/g1 bookTitleHe mismatch: ${entry?.meta?.bookTitleHe}`);
}
if (entry?.meta?.routeBase !== "/learning/book/hebrew/g1") {
  fail(`hebrew/g1 routeBase mismatch: ${entry?.meta?.routeBase}`);
}
if (entry?.registry.pageOrder.length !== 32) {
  fail(`hebrew/g1 expected 32 pages, got ${entry?.registry.pageOrder.length}`);
}
if (JSON.stringify(entry?.registry.pageOrder) !== JSON.stringify(HEBREW_G1_PAGE_ORDER)) {
  fail("hebrew/g1 page order mismatch vs registry");
}
if (entry?.features?.practice !== true) {
  fail("hebrew/g1 must enable practice feature");
}
if (getLearningBookIndexHref("hebrew", "g1") !== HEBREW_G1_BOOK_META.routeBase) {
  fail("hebrew/g1 index href mismatch");
}
if (getLearningBookMasterPath("hebrew") !== "/learning/hebrew-master") {
  fail("hebrew master path must be /learning/hebrew-master");
}

const tile = getLearningBookTileTitle("hebrew", "g1");
if (tile.line1 !== "ספר עברית" || tile.line2 !== "כיתה א׳") {
  fail(`hebrew/g1 tile title mismatch: ${JSON.stringify(tile)}`);
}

for (const pageId of HEBREW_G1_PAGE_ORDER) {
  if (!entry.registry.isValidPageId(pageId)) {
    fail(`hebrew/g1 invalid page id in registry: ${pageId}`);
  }
  const page = entry.loader.loadPage(pageId);
  if (!page) {
    fail(`hebrew/g1 could not load page: ${pageId}`);
    continue;
  }
  if (page.sections?.length !== 7) {
    fail(`hebrew/g1/${pageId}: expected 7 sections, got ${page.sections?.length}`);
  }
  const visible = JSON.stringify(page);
  if (visible.includes("[DRAFT")) {
    fail(`hebrew/g1/${pageId}: visible DRAFT marker in parsed page`);
  }
  if (page.displayTitle?.includes("[DRAFT")) {
    fail(`hebrew/g1/${pageId}: DRAFT in displayTitle`);
  }
  if (page.metadata?.subject !== "hebrew") {
    fail(`hebrew/g1/${pageId}: metadata subject must be hebrew`);
  }
  if (page.metadata?.approval_status !== "approved") {
    fail(`hebrew/g1/${pageId}: approval_status must be approved`);
  }
}

const batches = entry.loader.loadTocEntries();
if (batches.length !== 4) {
  fail(`hebrew/g1 expected 4 TOC batches, got ${batches.length}`);
}
const tocPages = batches.flatMap((b) => b.pages.map((p) => p.pageId));
if (JSON.stringify(tocPages) !== JSON.stringify(HEBREW_G1_PAGE_ORDER)) {
  fail("hebrew/g1 TOC page order mismatch");
}

if (errors.length) {
  console.error(
    "G1 Hebrew runtime verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}

console.log("G1 Hebrew runtime verification PASSED.");
console.log("- catalog entry authored, 32 pages, dynamic route /learning/book/hebrew/g1");
console.log("- practice feature enabled (topic mappings)");
console.log("- all pages load with 7 sections; approved metadata; no visible DRAFT markers");
