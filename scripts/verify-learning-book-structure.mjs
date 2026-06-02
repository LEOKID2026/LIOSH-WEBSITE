/**
 * Verify full learning book structure (Math G1–G6, גאומטריה G1–G6).
 * Run: node scripts/verify-learning-book-structure.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  LEARNING_BOOK_CATALOG_LIST,
  getLearningBookEntry,
} from "../lib/learning-book/learning-book-catalog.js";
import { BOOK_GRADE_THEMES } from "../lib/learning-book/book-grade-themes.js";
import { PLACEHOLDER_PAGE_ID } from "../lib/learning-book/learning-book-placeholders.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

let failures = 0;

function fail(msg) {
  failures += 1;
  console.error("FAIL:", msg);
}

function requireBookPracticeFeatures(entry, label) {
  if (!entry.features?.practice) {
    fail(`${label} must enable practice feature`);
  }
  if (!entry.features?.topicResolve) {
    fail(`${label} must enable topicResolve feature`);
  }
  if (!entry.features?.questionResolve) {
    fail(`${label} must enable questionResolve feature`);
  }
}

const EXPECTED_MATH = ["g1", "g2", "g3", "g4", "g5", "g6"];
const EXPECTED_GEOMETRY = ["g1", "g2", "g3", "g4", "g5", "g6"];

for (const grade of EXPECTED_MATH) {
  const entry = getLearningBookEntry("math", grade);
  if (!entry) fail(`missing math/${grade} catalog entry`);
}

for (const grade of EXPECTED_GEOMETRY) {
  const entry = getLearningBookEntry("geometry", grade);
  if (!entry) fail(`missing geometry/${grade} catalog entry`);
}

for (const grade of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
  if (!BOOK_GRADE_THEMES[grade]) {
    fail(`missing grade theme: ${grade}`);
  }
}

const routeBases = new Set();
for (const book of LEARNING_BOOK_CATALOG_LIST) {
  const base = book.meta.routeBase;
  if (routeBases.has(base)) {
    fail(`duplicate routeBase: ${base}`);
  }
  routeBases.add(base);

  if (book.subject === "geometry" && !book.meta.bookTitleHe?.includes("גאומטריה")) {
    fail(`geometry book missing גאומטריה in title: ${book.meta.bookTitleHe}`);
  }
  if (book.subject === "math" && !book.meta.bookTitleHe?.includes("חשבון")) {
    fail(`math book missing חשבון in title: ${book.meta.bookTitleHe}`);
  }

  const ids = book.registry.pageOrder;
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    fail(`duplicate page IDs in ${book.key}`);
  }

  for (const pageId of ids) {
    try {
      const page = book.loader.loadPage(pageId);
      if (!page) {
        fail(`${book.key}: could not load page ${pageId}`);
        continue;
      }
      if (page.sections?.length !== 7) {
        fail(`${book.key}/${pageId}: expected 7 sections, got ${page.sections?.length}`);
      }
      const visible = JSON.stringify(page);
      if (visible.includes("[DRAFT")) {
        fail(`${book.key}/${pageId}: visible DRAFT marker in parsed page`);
      }
      if (page.displayTitle?.includes("[DRAFT")) {
        fail(`${book.key}/${pageId}: DRAFT in displayTitle`);
      }
    } catch (err) {
      fail(`${book.key}/${pageId}: load error — ${err.message}`);
    }
  }

  if (book.status === "placeholder") {
    const draftPath = path.join(ROOT, book.meta.draftsDir, `${PLACEHOLDER_PAGE_ID}.md`);
    if (!fs.existsSync(draftPath)) {
      fail(`missing placeholder draft: ${draftPath}`);
    }
  }
}

const dynamicIndex = path.join(
  ROOT,
  "pages/learning/book/[subject]/[grade]/index.js"
);
const dynamicPage = path.join(
  ROOT,
  "pages/learning/book/[subject]/[grade]/[pageId].js"
);
if (!fs.existsSync(dynamicIndex)) fail("missing dynamic book index route");
if (!fs.existsSync(dynamicPage)) fail("missing dynamic book page route");

for (const grade of ["g1", "g2", "g3", "g4", "g5", "g6"]) {
  const explicit = path.join(ROOT, `pages/learning/book/math/${grade}/index.js`);
  if (!fs.existsSync(explicit)) {
    fail(`missing explicit math/${grade} route (must remain)`);
  }
}

const geometryG1Index = path.join(ROOT, "pages/learning/book/geometry/g1/index.js");
const geometryG1Page = path.join(ROOT, "pages/learning/book/geometry/g1/[pageId].js");
if (!fs.existsSync(geometryG1Index)) {
  fail("missing explicit geometry/g1 index route");
}
if (!fs.existsSync(geometryG1Page)) {
  fail("missing explicit geometry/g1 page route");
}

const geometryG1Entry = getLearningBookEntry("geometry", "g1");
if (!geometryG1Entry || geometryG1Entry.status !== "authored") {
  fail("geometry/g1 must be authored in catalog");
}
if (geometryG1Entry.registry.pageOrder.length !== 3) {
  fail(`geometry/g1 expected 3 pages, got ${geometryG1Entry.registry.pageOrder.length}`);
}
requireBookPracticeFeatures(geometryG1Entry, "geometry/g1");

const geometryG2Index = path.join(ROOT, "pages/learning/book/geometry/g2/index.js");
const geometryG2Page = path.join(ROOT, "pages/learning/book/geometry/g2/[pageId].js");
if (!fs.existsSync(geometryG2Index)) {
  fail("missing explicit geometry/g2 index route");
}
if (!fs.existsSync(geometryG2Page)) {
  fail("missing explicit geometry/g2 page route");
}

const geometryG2Entry = getLearningBookEntry("geometry", "g2");
if (!geometryG2Entry || geometryG2Entry.status !== "authored") {
  fail("geometry/g2 must be authored in catalog");
}
if (geometryG2Entry.registry.pageOrder.length !== 3) {
  fail(`geometry/g2 expected 3 pages, got ${geometryG2Entry.registry.pageOrder.length}`);
}
requireBookPracticeFeatures(geometryG2Entry, "geometry/g2");
if (!geometryG2Entry.meta.bookTitleHe?.includes("גאומטריה")) {
  fail("geometry/g2 book title must use גאומטריה");
}
if (geometryG2Entry.meta.bookTitleHe?.includes("הנדסה")) {
  fail("geometry/g2 book title must not use הנדסה");
}

const geometryG3Index = path.join(ROOT, "pages/learning/book/geometry/g3/index.js");
const geometryG3Page = path.join(ROOT, "pages/learning/book/geometry/g3/[pageId].js");
if (!fs.existsSync(geometryG3Index)) {
  fail("missing explicit geometry/g3 index route");
}
if (!fs.existsSync(geometryG3Page)) {
  fail("missing explicit geometry/g3 page route");
}

const geometryG3Entry = getLearningBookEntry("geometry", "g3");
if (!geometryG3Entry || geometryG3Entry.status !== "authored") {
  fail("geometry/g3 must be authored in catalog");
}
if (geometryG3Entry.registry.pageOrder.length !== 9) {
  fail(`geometry/g3 expected 9 pages, got ${geometryG3Entry.registry.pageOrder.length}`);
}
requireBookPracticeFeatures(geometryG3Entry, "geometry/g3");
if (!geometryG3Entry.meta.bookTitleHe?.includes("גאומטריה")) {
  fail("geometry/g3 book title must use גאומטריה");
}
if (geometryG3Entry.meta.bookTitleHe?.includes("הנדסה")) {
  fail("geometry/g3 book title must not use הנדסה");
}

const geometryG4Index = path.join(ROOT, "pages/learning/book/geometry/g4/index.js");
const geometryG4Page = path.join(ROOT, "pages/learning/book/geometry/g4/[pageId].js");
if (!fs.existsSync(geometryG4Index)) {
  fail("missing explicit geometry/g4 index route");
}
if (!fs.existsSync(geometryG4Page)) {
  fail("missing explicit geometry/g4 page route");
}

const geometryG4Entry = getLearningBookEntry("geometry", "g4");
if (!geometryG4Entry || geometryG4Entry.status !== "authored") {
  fail("geometry/g4 must be authored in catalog");
}
if (geometryG4Entry.registry.pageOrder.length !== 14) {
  fail(
    `geometry/g4 expected 14 pages, got ${geometryG4Entry.registry.pageOrder.length}`
  );
}
requireBookPracticeFeatures(geometryG4Entry, "geometry/g4");
if (!geometryG4Entry.meta.bookTitleHe?.includes("גאומטריה")) {
  fail("geometry/g4 book title must use גאומטריה");
}
if (geometryG4Entry.meta.bookTitleHe?.includes("הנדסה")) {
  fail("geometry/g4 book title must not use הנדסה");
}

const geometryG5Index = path.join(ROOT, "pages/learning/book/geometry/g5/index.js");
const geometryG5Page = path.join(ROOT, "pages/learning/book/geometry/g5/[pageId].js");
if (!fs.existsSync(geometryG5Index)) {
  fail("missing explicit geometry/g5 index route");
}
if (!fs.existsSync(geometryG5Page)) {
  fail("missing explicit geometry/g5 page route");
}

const geometryG5Entry = getLearningBookEntry("geometry", "g5");
if (!geometryG5Entry || geometryG5Entry.status !== "authored") {
  fail("geometry/g5 must be authored in catalog");
}
if (geometryG5Entry.registry.pageOrder.length !== 17) {
  fail(
    `geometry/g5 expected 17 pages, got ${geometryG5Entry.registry.pageOrder.length}`
  );
}
requireBookPracticeFeatures(geometryG5Entry, "geometry/g5");
if (!geometryG5Entry.meta.bookTitleHe?.includes("גאומטריה")) {
  fail("geometry/g5 book title must use גאומטריה");
}
if (geometryG5Entry.meta.bookTitleHe?.includes("הנדסה")) {
  fail("geometry/g5 book title must not use הנדסה");
}

const geometryG6Index = path.join(ROOT, "pages/learning/book/geometry/g6/index.js");
const geometryG6Page = path.join(ROOT, "pages/learning/book/geometry/g6/[pageId].js");
if (!fs.existsSync(geometryG6Index)) {
  fail("missing explicit geometry/g6 index route");
}
if (!fs.existsSync(geometryG6Page)) {
  fail("missing explicit geometry/g6 page route");
}

const geometryG6Entry = getLearningBookEntry("geometry", "g6");
if (!geometryG6Entry || geometryG6Entry.status !== "authored") {
  fail("geometry/g6 must be authored in catalog");
}
if (geometryG6Entry.registry.pageOrder.length !== 19) {
  fail(
    `geometry/g6 expected 19 pages, got ${geometryG6Entry.registry.pageOrder.length}`
  );
}
requireBookPracticeFeatures(geometryG6Entry, "geometry/g6");
if (!geometryG6Entry.meta.bookTitleHe?.includes("גאומטריה")) {
  fail("geometry/g6 book title must use גאומטריה");
}
if (geometryG6Entry.meta.bookTitleHe?.includes("הנדסה")) {
  fail("geometry/g6 book title must not use הנדסה");
}

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}

console.log(
  `OK: learning book structure — ${LEARNING_BOOK_CATALOG_LIST.length} books (${LEARNING_BOOK_CATALOG_LIST.filter((b) => b.status === "authored").length} authored, ${LEARNING_BOOK_CATALOG_LIST.filter((b) => b.status === "placeholder").length} placeholder), themes g1–g6.`
);
