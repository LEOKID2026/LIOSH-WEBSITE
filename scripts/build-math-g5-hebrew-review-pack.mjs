/**
 * Regenerate docs/learning-book/MATH_GRADE_5_HEBREW_REVIEW_PACK.md from G5 drafts.
 * Run: node scripts/build-math-g5-hebrew-review-pack.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  MATH_G5_PAGE_ORDER,
  MATH_G5_BOOK_BATCHES,
} from "./lib/math-g5-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/math/g5/drafts");
const OUT_PATH = path.join(
  __dirname,
  "../docs/learning-book/MATH_GRADE_5_HEBREW_REVIEW_PACK.md"
);

function readMetadataField(raw, field) {
  const re = new RegExp(`\\|\\s*\\*\\*${field}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`, "i");
  const m = raw.match(re);
  return m ? m[1].trim() : "";
}

function validatePages() {
  const errors = [];
  for (const pageId of MATH_G5_PAGE_ORDER) {
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
    const ageBand = readMetadataField(raw, "age_band");
    if (ageBand !== "grades_5_6") {
      errors.push(`${pageId}.md: age_band must be grades_5_6 (found: ${ageBand || "missing"})`);
    }
    if (readMetadataField(raw, "grade") !== "g5") {
      errors.push(`${pageId}.md: grade must be g5`);
    }
    const childFacing = page.sections.map((s) => s.body).join("\n");
    if (childFacing.includes("מתמטיקה")) {
      errors.push(`${pageId}.md: contains forbidden מתמטיקה in section body`);
    }
  }
  if (errors.length) {
    throw new Error(`Validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
}

const batchSummary = MATH_G5_BOOK_BATCHES.map(
  (b) => `| **Batch ${b.id.toUpperCase()}** (${b.titleHe}) | ${b.pages.length} |`
).join("\n");

const header = `# Grade 5 Math Learning Book — Hebrew Review Pack

> **Status:** All content in this pack is **draft** (\`approval_status: draft\`). Nothing here is owner-approved or production-ready.
>
> **Hebrew titles:** Current \`title_hebrew\` values are **not final owner-approved** copy. They include draft markers in source files; reviewers should treat titles as provisional.
>
> **Draft coverage:** Grade 5 has **${MATH_G5_PAGE_ORDER.length} / ${MATH_G5_PAGE_ORDER.length}** draft pages authored (Batches A–H). Source: \`docs/learning-book/math/g5/drafts/\`.
>
> **UI / runtime:** Grade 5 Learning Book **UI is not wired to this content** — no registry, route, or practice CTA resolver. This pack is documentation for owner and Hebrew review only.
>
> **Review focus:** **Grade 5 suitability**, **clarity**, **examples**, **child-facing Hebrew**, **conceptual accuracy**, **Section 5 / Section 6 alignment**, and **Bidi safety** for grouped thousands, fractions, decimals, and equations.
>
> **Pack version:** Initial full-book review pack (June 2026). Generated from current source markdown.

---

## Summary

| Metric | Value |
|--------|-------|
| **Total pages** | ${MATH_G5_PAGE_ORDER.length} |
${batchSummary}
| **All pages** | \`approval_status: draft\` |

---

**Book:** ספר חשבון — כיתה ה׳  
**Pages:** ${MATH_G5_PAGE_ORDER.length}  
**Sections per page:** 7  
**Source folder:** \`docs/learning-book/math/g5/drafts/\`

---

`;

validatePages();

const pageBlocks = MATH_G5_PAGE_ORDER.map((pageId, index) => {
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
console.log(`Wrote ${OUT_PATH} (${MATH_G5_PAGE_ORDER.length} pages).`);
console.log(
  `Validation: all ${MATH_G5_PAGE_ORDER.length} files exist, 7 sections each, draft status, DRAFT titles, grades_5_6, no מתמטיקה in bodies.`
);
