/**
 * Verify all Grade 1 Math book pages parse with sections 1–7 and clean titles.
 * Run: node scripts/verify-math-g1-book.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MATH_G1_PAGE_ORDER } from "../lib/learning-book/math-g1-registry.js";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
  cleanDisplayTitle,
} from "../lib/learning-book/parse-learning-page-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/math/g1/drafts");
const DRAFT_MARKER = /\[DRAFT|not owner-approved|math:g1:|approval_status|`/i;

try {
  const pages = MATH_G1_PAGE_ORDER.map((pageId) => {
    const raw = fs.readFileSync(path.join(DRAFTS_DIR, `${pageId}.md`), "utf8");
    const page = parseLearningPageMarkdown(raw, pageId);
    assertMathG1PageSections(page);
    return page;
  });

  let ok = true;
  for (const page of pages) {
    if (!page.displayTitle || DRAFT_MARKER.test(page.displayTitle)) {
      console.error(`FAIL ${page.pageId}: dirty displayTitle "${page.displayTitle}"`);
      ok = false;
    }
    const emptySection = page.sections.find((s) => !s.body?.trim());
    if (emptySection) {
      console.error(`FAIL ${page.pageId}: section ${emptySection.number} has empty body`);
      ok = false;
    }
  }

  if (!ok) process.exit(1);

  console.log(`OK: ${pages.length} pages, 7 sections each, clean titles.`);
  console.log("Sample:", pages[0].displayTitle);
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
