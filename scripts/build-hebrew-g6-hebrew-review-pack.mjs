/**
 * Regenerate docs/learning-book/HEBREW_GRADE_6_HEBREW_REVIEW_PACK.md from G6 Hebrew drafts.
 * Run: node scripts/build-hebrew-g6-hebrew-review-pack.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  HEBREW_G6_PAGE_ORDER,
  HEBREW_G6_BOOK_BATCHES,
  HEBREW_G6_RICH_BAND_PAGE_IDS,
} from "./lib/hebrew-g6-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/hebrew/g6/drafts");
const OUT_PATH = path.join(
  __dirname,
  "../docs/learning-book/HEBREW_GRADE_6_HEBREW_REVIEW_PACK.md"
);

function readMetadataField(raw, field) {
  const re = new RegExp(`\\|\\s*\\*\\*${field}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`, "i");
  const m = raw.match(re);
  return m ? m[1].trim() : "";
}

function validatePages() {
  const errors = [];
  for (const pageId of HEBREW_G6_PAGE_ORDER) {
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
    if (readMetadataField(raw, "grade") !== "g6") {
      errors.push(`${pageId}.md: grade must be g6`);
    }
    if (readMetadataField(raw, "age_band") !== "grades_5_6") {
      errors.push(`${pageId}.md: age_band must be grades_5_6`);
    }
    if (readMetadataField(raw, "subject") !== "hebrew") {
      errors.push(`${pageId}.md: subject must be hebrew`);
    }
    if (HEBREW_G6_RICH_BAND_PAGE_IDS.has(pageId) && !raw.includes("G6 depth")) {
      errors.push(`${pageId}.md: rich band page missing G6 depth metadata note`);
    }
    const childFacing = page.sections.map((s) => s.body).join("\n");
    if (/\bhebrew\b/i.test(childFacing)) {
      errors.push(`${pageId}.md: contains English hebrew in section body`);
    }
    if (/\[DRAFT/i.test(childFacing)) {
      errors.push(`${pageId}.md: [DRAFT] in child-facing section body`);
    }
  }
  if (errors.length) {
    throw new Error(`Validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
}

const batchSummary = HEBREW_G6_BOOK_BATCHES.map(
  (b) => `| **Batch ${b.id.toUpperCase()}** (${b.titleHe}) | ${b.pages.length} |`
).join("\n");

const header = `# Grade 6 Hebrew / עברית Learning Book — Hebrew Review Pack

> **Status:** All content in this pack is **draft** (\`approval_status: draft\`). Nothing here is owner-approved or production-ready.
>
> **Book naming:** Child-facing copy uses **עברית** — ספר עברית — כיתה ו׳.
>
> **Draft coverage:** Grade 6 Hebrew has **${HEBREW_G6_PAGE_ORDER.length} / ${HEBREW_G6_PAGE_ORDER.length}** draft pages authored. Source: \`docs/learning-book/hebrew/g6/drafts/\`.
>
> **UI / runtime:** Grade 6 Hebrew Learning Book **UI is not wired to this content** — no registry, route, or practice CTA resolver.
>
> **Review focus:** G6 depth on rich 5–6 band; critical reading, evidence, debate/research neutrality; Section 5 / Section 6 alignment.
>
> **Pack version:** Initial full-book review pack (June 2026). Generated from current source markdown.

---

## Summary

| Metric | Value |
|--------|-------|
| **Total pages** | ${HEBREW_G6_PAGE_ORDER.length} |
${batchSummary}
| **Rich 5–6 band pages** | ${HEBREW_G6_RICH_BAND_PAGE_IDS.size} |
| **All pages** | \`approval_status: draft\` |

---

**Book:** ספר עברית — כיתה ו׳  
**Pages:** ${HEBREW_G6_PAGE_ORDER.length}  
**Sections per page:** 7  
**Source folder:** \`docs/learning-book/hebrew/g6/drafts/\`

---

`;

validatePages();

const pageBlocks = HEBREW_G6_PAGE_ORDER.map((pageId, index) => {
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
console.log(`Wrote ${OUT_PATH} (${HEBREW_G6_PAGE_ORDER.length} pages).`);
