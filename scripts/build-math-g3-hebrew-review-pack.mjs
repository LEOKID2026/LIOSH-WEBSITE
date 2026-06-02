/**
 * Regenerate docs/learning-book/MATH_GRADE_3_HEBREW_REVIEW_PACK.md from G3 drafts.
 * Run: node scripts/build-math-g3-hebrew-review-pack.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import { MATH_G3_PAGE_ORDER } from "../lib/learning-book/math-g3-registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/math/g3/drafts");
const OUT_PATH = path.join(
  __dirname,
  "../docs/learning-book/MATH_GRADE_3_HEBREW_REVIEW_PACK.md"
);

function readMetadataField(raw, field) {
  const re = new RegExp(`\\|\\s*\\*\\*${field}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`, "i");
  const m = raw.match(re);
  return m ? m[1].trim() : "";
}

function validatePages() {
  const errors = [];
  for (const pageId of MATH_G3_PAGE_ORDER) {
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
    if (ageBand !== "grades_3_4") {
      errors.push(`${pageId}.md: age_band must be grades_3_4 (found: ${ageBand || "missing"})`);
    }
    if (raw.includes("מתמטיקה")) {
      errors.push(`${pageId}.md: contains forbidden מתמטיקה`);
    }
  }
  if (errors.length) {
    throw new Error(`Validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
}

const header = `# Grade 3 Math Learning Book — Hebrew Review Pack

> **Status:** All content in this pack is **draft** (\`approval_status: draft\`). Nothing here is owner-approved or production-ready.
>
> **Hebrew titles:** Current \`title_hebrew\` values are **not final owner-approved** copy. They include draft markers in source files; reviewers should treat titles as provisional.
>
> **Draft coverage:** Grade 3 has **26 / 26** draft pages authored (Batches A–D). Source: \`docs/learning-book/math/g3/drafts/\`.
>
> **UI / runtime:** Grade 3 Learning Book **UI is not wired to this content yet** — no registry, route, or practice CTA resolver for G3 topic pages. This pack is documentation for owner and Hebrew review only.
>
> **Review focus:** **Grade 3 suitability**, **clarity**, **examples**, **child-facing Hebrew**, **conceptual accuracy**, and **Section 5 / Section 6 alignment** (try-it-yourself vs common-mistake context must match).
>
> **Pack version:** Initial full-book review pack (June 2026). Generated from current source markdown.

---

## Summary

| Metric | Value |
|--------|-------|
| **Total pages** | 26 |
| **Batch A** (יסודות מספרים, השוואה וסדרות) | 7 |
| **Batch B** (חיבור, חיסור, כפל וחילוק) | 9 |
| **Batch C** (משוואות, עשרוניים וסדר פעולות) | 7 |
| **Batch D** (שאלות מילוליות) | 3 |
| **All pages** | \`approval_status: draft\` |

---

**Book:** ספר חשבון — כיתה ג׳  
**Pages:** ${MATH_G3_PAGE_ORDER.length}  
**Sections per page:** 7  
**Source folder:** \`docs/learning-book/math/g3/drafts/\`

---

`;

validatePages();

const pageBlocks = MATH_G3_PAGE_ORDER.map((pageId, index) => {
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
console.log(`Wrote ${OUT_PATH} (${MATH_G3_PAGE_ORDER.length} pages).`);
console.log(
  "Validation: all 26 files exist, 7 sections each, draft status, DRAFT titles, grades_3_4, no מתמטיקה."
);
