/**
 * Regenerate docs/learning-book/ENGLISH_GRADE_5_HEBREW_REVIEW_PACK.md from G5 English drafts.
 * Run: node scripts/build-english-g5-hebrew-review-pack.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  ENGLISH_G5_PAGE_ORDER,
  ENGLISH_G5_BOOK_BATCHES,
} from "./lib/english-g5-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/english/g5/drafts");
const OUT_PATH = path.join(
  __dirname,
  "../docs/learning-book/ENGLISH_GRADE_5_HEBREW_REVIEW_PACK.md"
);

function readMetadataField(raw, field) {
  const re = new RegExp(`\\|\\s*\\*\\*${field}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`, "i");
  const m = raw.match(re);
  return m ? m[1].trim() : "";
}

function validatePages() {
  const errors = [];
  for (const pageId of ENGLISH_G5_PAGE_ORDER) {
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
    if (readMetadataField(raw, "approval_status") !== "draft") {
      errors.push(`${pageId}.md: approval_status must be draft`);
    }
    if (!readMetadataField(raw, "title_hebrew").includes("[DRAFT")) {
      errors.push(`${pageId}.md: title_hebrew missing [DRAFT — not owner-approved]`);
    }
    if (readMetadataField(raw, "grade") !== "g5") {
      errors.push(`${pageId}.md: grade must be g5`);
    }
    if (readMetadataField(raw, "subject") !== "english") {
      errors.push(`${pageId}.md: subject must be english`);
    }
    if (readMetadataField(raw, "age_band") !== "grades_5_6") {
      errors.push(`${pageId}.md: age_band must be grades_5_6`);
    }
  }
  if (errors.length) {
    throw new Error(`Validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
}

const batchSummary = ENGLISH_G5_BOOK_BATCHES.map(
  (b) => `| **Batch ${b.id.toUpperCase()}** (${b.titleHe}) | ${b.pages.length} |`
).join("\n");

const header = `# Grade 5 English Learning Book — Hebrew Review Pack

> **Status:** All content in this pack is **draft** (\`approval_status: draft\`). Nothing here is owner-approved or production-ready.
>
> **Book naming:** Child-facing copy uses **אנגלית** — ספר אנגלית — כיתה ה׳.
>
> **Draft coverage:** Grade 5 English has **${ENGLISH_G5_PAGE_ORDER.length} / ${ENGLISH_G5_PAGE_ORDER.length}** draft pages authored. Source: \`docs/learning-book/english/g5/drafts/\`.
>
> **UI / runtime:** Grade 5 English Learning Book **UI is not wired to this content** — no registry, route, or practice CTA resolver.
>
> **Review focus:** Grade 5 extended literacy, Past Simple / Future / Modals, Hebrew explanations, Section 5 / Section 6 alignment, Bidi/LTR safety.
>
> **Pack version:** Initial full-book review pack (June 2026). Generated from current source markdown.

---

## Summary

| Metric | Value |
|--------|-------|
| **Total pages** | ${ENGLISH_G5_PAGE_ORDER.length} |
${batchSummary}
| **All pages** | \`approval_status: draft\` |

---

**Book:** ספר אנגלית — כיתה ה׳  
**Pages:** ${ENGLISH_G5_PAGE_ORDER.length}  
**Sections per page:** 7  
**Source folder:** \`docs/learning-book/english/g5/drafts/\`

---

`;

validatePages();

const pageBlocks = ENGLISH_G5_PAGE_ORDER.map((pageId, index) => {
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
console.log(`Wrote ${OUT_PATH} (${ENGLISH_G5_PAGE_ORDER.length} pages).`);
