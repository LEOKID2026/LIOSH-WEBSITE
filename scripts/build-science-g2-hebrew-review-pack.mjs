/**
 * Regenerate docs/learning-book/SCIENCE_GRADE_2_HEBREW_REVIEW_PACK.md from G2 science drafts.
 * Run: node scripts/build-science-g2-hebrew-review-pack.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  SCIENCE_G2_PAGE_ORDER,
  SCIENCE_G2_BOOK_BATCHES,
} from "./lib/science-g2-draft-manifest.mjs";
import { readMetadataField } from "./lib/verify-science-grade-book-content-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/science/g2/drafts");
const OUT_PATH = path.join(
  __dirname,
  "../docs/learning-book/SCIENCE_GRADE_2_HEBREW_REVIEW_PACK.md"
);

function validatePages() {
  const errors = [];
  for (const pageId of SCIENCE_G2_PAGE_ORDER) {
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
    if (readMetadataField(raw, "grade") !== "g2") {
      errors.push(`${pageId}.md: grade must be g2`);
    }
    if (readMetadataField(raw, "age_band") !== "grades_1_2") {
      errors.push(`${pageId}.md: age_band must be grades_1_2`);
    }
  }
  if (errors.length) {
    throw new Error(`Validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
}

const batchSummary = SCIENCE_G2_BOOK_BATCHES.map(
  (b) => `| **Batch ${b.id.toUpperCase()}** (${b.titleHe}) | ${b.pages.length} |`
).join("\n");

const header = `# Grade 2 Science Learning Book — Hebrew Review Pack

> **Status:** All content in this pack is **draft** (\`approval_status: draft\`). Nothing here is owner-approved or production-ready.
>
> **Book naming:** Child-facing copy uses **מדעים**.
>
> **Draft coverage:** Grade 2 Science has **${SCIENCE_G2_PAGE_ORDER.length} / ${SCIENCE_G2_PAGE_ORDER.length}** draft pages. First grade with \`experiments\` page.
>
> **Experiments:** Safe conceptual only — observation, comparison, fair-test intro. No dangerous procedures.
>
> **UI / runtime:** Not wired — no registry, route, or practice CTA.

---

## Summary

| Metric | Value |
|--------|-------|
| **Total pages** | ${SCIENCE_G2_PAGE_ORDER.length} |
${batchSummary}
| **All pages** | \`approval_status: draft\` |

---

**Book:** ספר מדעים — כיתה ב׳  
**Sections per page:** 7  

---

`;

validatePages();

const pageBlocks = SCIENCE_G2_PAGE_ORDER.map((pageId, index) => {
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
console.log(`Wrote ${OUT_PATH} (${SCIENCE_G2_PAGE_ORDER.length} pages).`);
