/**
 * Verify full learning book structure (Math G1–G6, הנדסה G1–G6).
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

  if (base.includes("גאומטריה")) {
    fail(`route uses forbidden label גאומטריה: ${base}`);
  }
  if (book.meta.bookTitleHe?.includes("גאומטריה")) {
    fail(`bookTitleHe uses גאומטריה: ${book.meta.bookTitleHe}`);
  }
  if (book.subject === "geometry" && !book.meta.bookTitleHe?.includes("הנדסה")) {
    fail(`geometry book missing הנדסה in title: ${book.meta.bookTitleHe}`);
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

for (const grade of ["g1", "g2", "g3", "g4"]) {
  const explicit = path.join(ROOT, `pages/learning/book/math/${grade}/index.js`);
  if (!fs.existsSync(explicit)) {
    fail(`missing explicit math/${grade} route (must remain)`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}

console.log(
  `OK: learning book structure — ${LEARNING_BOOK_CATALOG_LIST.length} books (${LEARNING_BOOK_CATALOG_LIST.filter((b) => b.status === "authored").length} authored, ${LEARNING_BOOK_CATALOG_LIST.filter((b) => b.status === "placeholder").length} placeholder), themes g1–g6.`
);
