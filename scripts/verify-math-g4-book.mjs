/**
 * Verify all Grade 4 Math book pages parse with sections 1–7 and clean titles.
 * Run: node scripts/verify-math-g4-book.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  MATH_G4_PAGE_ORDER,
  MATH_G4_BOOK_BATCHES,
} from "../lib/learning-book/math-g4-registry.js";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/math/g4/drafts");
const DRAFT_MARKER = /\[DRAFT|not owner-approved|math:g4:|approval_status|`/i;

try {
  const registryFlat = MATH_G4_BOOK_BATCHES.flatMap((b) => b.pages);
  if (registryFlat.length !== 37) {
    throw new Error(`Expected 37 pages in registry, got ${registryFlat.length}`);
  }
  if (registryFlat.join(",") !== MATH_G4_PAGE_ORDER.join(",")) {
    throw new Error("MATH_G4_PAGE_ORDER does not match batch flat order");
  }
  const unique = new Set(MATH_G4_PAGE_ORDER);
  if (unique.size !== MATH_G4_PAGE_ORDER.length) {
    throw new Error("Duplicate page IDs in MATH_G4_PAGE_ORDER");
  }

  const pages = MATH_G4_PAGE_ORDER.map((pageId) => {
    const filePath = path.join(DRAFTS_DIR, `${pageId}.md`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing draft file: ${pageId}.md`);
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const page = parseLearningPageMarkdown(raw, pageId);
    assertMathG1PageSections(page);
    if (raw.includes("מתמטיקה")) {
      throw new Error(`${pageId}.md contains forbidden מתמטיקה`);
    }
    const approvalMatch = raw.match(/\|\s*\*\*approval_status\*\*\s*\|\s*(\S+)\s*\|/i);
    if (!approvalMatch || approvalMatch[1] !== "draft") {
      throw new Error(`${pageId}.md approval_status must be draft`);
    }
    return page;
  });

  let ok = true;
  for (const page of pages) {
    if (!page.displayTitle || DRAFT_MARKER.test(page.displayTitle)) {
      console.error(`FAIL ${page.pageId}: dirty displayTitle "${page.displayTitle}"`);
      ok = false;
    }
    if (page.pageId === "fm_gcd" && !page.displayTitle.includes("המחלק המשותף הגדול ביותר")) {
      console.error(
        `FAIL fm_gcd: displayTitle must lead with full phrase, got "${page.displayTitle}"`
      );
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
  console.log("Registry order:", MATH_G4_PAGE_ORDER.join(", "));
  console.log("Sample title:", pages[0].displayTitle);
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
