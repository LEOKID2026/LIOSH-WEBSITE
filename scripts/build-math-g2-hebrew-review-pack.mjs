/**
 * Regenerate docs/learning-book/MATH_GRADE_2_HEBREW_REVIEW_PACK.md from G2 drafts.
 * Run: node scripts/build-math-g2-hebrew-review-pack.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/math/g2/drafts");
const OUT_PATH = path.join(
  __dirname,
  "../docs/learning-book/MATH_GRADE_2_HEBREW_REVIEW_PACK.md"
);

/** Planned page order — mirrors README / MATH_GRADE_2_LEARNING_BOOK_PLAN.md */
export const MATH_G2_PAGE_ORDER = [
  // Batch A
  "ns_place_tens_units",
  "ns_neighbors",
  "ns_complement10",
  "ns_even_odd",
  "cmp",
  // Batch B
  "add_two",
  "sub_two",
  "add_vertical",
  "sub_vertical",
  "mul",
  "div",
  // Batch C
  "divisibility",
  "frac_half",
  "frac_half_reverse",
  "frac_quarter",
  "frac_quarter_reverse",
  // Batch D
  "wp_coins",
  "wp_coins_spent",
  "wp_time_date",
  "wp_time_days",
  "wp_groups_g2",
  "wp_division_simple",
];

function readMetadataField(raw, field) {
  const re = new RegExp(`\\|\\s*\\*\\*${field}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`, "i");
  const m = raw.match(re);
  return m ? m[1].trim() : "";
}

function validatePages() {
  const errors = [];
  for (const pageId of MATH_G2_PAGE_ORDER) {
    const filePath = path.join(DRAFTS_DIR, `${pageId}.md`);
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing file: ${pageId}.md`);
      continue;
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const page = parseLearningPageMarkdown(raw, pageId);
    try {
      assertMathG1PageSections(page);
    } catch (e) {
      errors.push(e.message);
    }
    const approval = readMetadataField(raw, "approval_status");
    if (approval !== "draft") {
      errors.push(`${pageId}.md: approval_status must be draft (found: ${approval || "missing"})`);
    }
    const titleHebrew = readMetadataField(raw, "title_hebrew");
    if (!titleHebrew.includes("[DRAFT")) {
      errors.push(`${pageId}.md: title_hebrew missing [DRAFT — not owner-approved]`);
    }
    if (raw.includes("כיתה ב'")) {
      errors.push(`${pageId}.md: contains forbidden כיתה ב' (use כיתה ב׳)`);
    }
  }
  if (errors.length) {
    throw new Error(`Validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
}

const header = `# Grade 2 Math Learning Book — Hebrew Review Pack

> **Status:** All content in this pack is **draft** (\`approval_status: draft\`). Nothing here is owner-approved or production-ready.
>
> **Hebrew titles:** Current \`title_hebrew\` values are **not final owner-approved** copy. They include draft markers in source files; reviewers should treat titles as provisional.
>
> **Draft coverage:** Grade 2 has **22 / 22** draft pages authored (Batches A–D). Source: \`docs/learning-book/math/g2/drafts/\`.
>
> **UI / runtime:** Grade 2 Learning Book **UI is not implemented yet** — no route, registry, or practice CTA resolver. This pack is documentation for owner and Hebrew review only.
>
> **Review focus:** **Grade 2 suitability**, **clarity**, **examples**, **child-facing Hebrew**, **conceptual accuracy**, and **Section 5 / Section 6 alignment** (try-it-yourself vs common-mistake context must match).
>
> **Pack version:** Initial full-book review pack (June 2026). Generated from current source markdown.

---

## Summary

| Metric | Value |
|--------|-------|
| **Total pages** | 22 |
| **Batch A** (יסודות מספרים והשוואה) | 5 |
| **Batch B** (חיבור, חיסור, כפל וחילוק) | 6 |
| **Batch C** (התחלקות ושברים) | 5 |
| **Batch D** (שאלות מילוליות) | 6 |
| **All pages** | \`approval_status: draft\` |

---

**Book:** ספר חשבון — כיתה ב׳  
**Pages:** ${MATH_G2_PAGE_ORDER.length}  
**Sections per page:** 7  
**Source folder:** \`docs/learning-book/math/g2/drafts/\`

---

`;

validatePages();

const pageBlocks = MATH_G2_PAGE_ORDER.map((pageId, index) => {
  const raw = fs.readFileSync(path.join(DRAFTS_DIR, `${pageId}.md`), "utf8");
  const page = parseLearningPageMarkdown(raw, pageId);
  const titleHebrew = readMetadataField(raw, "title_hebrew") || page.metadata.title_hebrew;
  const learningPageId =
    readMetadataField(raw, "learning_page_id") || page.metadata.learning_page_id;
  const skillId = readMetadataField(raw, "skill_id") || page.metadata.skill_id;
  const approvalStatus =
    readMetadataField(raw, "approval_status") || page.metadata.approval_status;

  const metaTable = `## Page ${index + 1}: ${pageId}.md

| Field | Value |
|-------|-------|
| **File** | \`${pageId}.md\` |
| **learning_page_id** | \`${learningPageId.replace(/^`|`$/g, "")}\` |
| **skill_id** | \`${skillId.replace(/^`|`$/g, "")}\` |
| **title_hebrew** | ${titleHebrew} |
| **approval_status** | \`${approvalStatus.replace(/^`|`$/g, "")}\` |`;

  const sections = page.sections
    .map((section) => {
      return `### Section ${section.number}. ${section.title}

${section.body.trim()}`;
    })
    .join("\n\n---\n\n---\n\n");

  return `${metaTable}\n\n${sections}\n\n---\n`;
});

fs.writeFileSync(OUT_PATH, header + pageBlocks.join("\n"), "utf8");
console.log(`Wrote ${OUT_PATH} (${MATH_G2_PAGE_ORDER.length} pages).`);
console.log("Validation: all 22 files exist, 7 sections each, draft status, DRAFT titles, no כיתה ב'.");
