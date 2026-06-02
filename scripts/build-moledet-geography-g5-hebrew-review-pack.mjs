/**
 * Regenerate docs/learning-book/MOLEDET_GEOGRAPHY_GRADE_5_HEBREW_REVIEW_PACK.md from G5 drafts.
 * Run: node scripts/build-moledet-geography-g5-hebrew-review-pack.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  MOLEDET_GEOGRAPHY_G5_PAGE_ORDER,
  MOLEDET_GEOGRAPHY_G5_BOOK_BATCHES,
  MOLEDET_GEOGRAPHY_G5_VERIFY_INSTITUTIONS,
} from "./lib/moledet-geography-g5-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/moledet-geography/g5/drafts");
const OUT_PATH = path.join(
  __dirname,
  "../docs/learning-book/MOLEDET_GEOGRAPHY_GRADE_5_HEBREW_REVIEW_PACK.md"
);

function readMetadataField(raw, field) {
  const re = new RegExp(`\\|\\s*\\*\\*${field}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`, "i");
  const m = raw.match(re);
  return m ? m[1].trim() : "";
}

function validatePages() {
  const errors = [];
  for (const pageId of MOLEDET_GEOGRAPHY_G5_PAGE_ORDER) {
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
    if (readMetadataField(raw, "age_band") !== "grades_5_6") {
      errors.push(`${pageId}.md: age_band must be grades_5_6`);
    }
    const childFacing = page.sections.map((s) => s.body).join("\n");
    if (/\bgeography\b/i.test(childFacing)) {
      errors.push(`${pageId}.md: contains English geography in section body`);
    }
  }
  if (errors.length) {
    throw new Error(`Validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
}

const batchSummary = MOLEDET_GEOGRAPHY_G5_BOOK_BATCHES.map(
  (b) => `| **Batch ${b.id.toUpperCase()}** (${b.titleHe}) | ${b.pages.length} |`
).join("\n");

const verifyNotes = MOLEDET_GEOGRAPHY_G5_VERIFY_INSTITUTIONS.map((n) => `- ${n}`).join("\n");

const header = `# Grade 5 Moledet / Geography Learning Book — Hebrew Review Pack

> **Status:** All content in this pack is **draft** (\`approval_status: draft\`). Nothing here is owner-approved or production-ready.
>
> **Book naming:** Child-facing copy uses **מולדת וגאוגרפיה**.
>
> **Draft coverage:** Grade 5 Moledet/Geography has **${MOLEDET_GEOGRAPHY_G5_PAGE_ORDER.length} / ${MOLEDET_GEOGRAPHY_G5_PAGE_ORDER.length}** draft pages. Source: \`docs/learning-book/moledet-geography/g5/drafts/\`.
>
> **Tone:** Hazards = awareness not fear. Climate/resources = geography/civic framing. Institutions = roles only.
>
> **Owner verification flags:**
${verifyNotes}
>
> **Pack version:** Initial full-book review pack (June 2026). Generated from current source markdown.

---

## Summary

| Metric | Value |
|--------|-------|
| **Total pages** | ${MOLEDET_GEOGRAPHY_G5_PAGE_ORDER.length} |
${batchSummary}
| **All pages** | \`approval_status: draft\` |

---

**Book:** ספר מולדת וגאוגרפיה — כיתה ה׳  
**Pages:** ${MOLEDET_GEOGRAPHY_G5_PAGE_ORDER.length}  
**Sections per page:** 7  

---

`;

validatePages();

const pageBlocks = MOLEDET_GEOGRAPHY_G5_PAGE_ORDER.map((pageId, index) => {
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
console.log(`Wrote ${OUT_PATH} (${MOLEDET_GEOGRAPHY_G5_PAGE_ORDER.length} pages).`);
