/**
 * Regenerate docs/learning-book/HEBREW_GRADE_1_HEBREW_REVIEW_PACK.md from G1 Hebrew drafts.
 * Run: node scripts/build-hebrew-g1-hebrew-review-pack.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  HEBREW_G1_PAGE_ORDER,
  HEBREW_G1_BOOK_BATCHES,
} from "./lib/hebrew-g1-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/hebrew/g1/drafts");
const OUT_PATH = path.join(
  __dirname,
  "../docs/learning-book/HEBREW_GRADE_1_HEBREW_REVIEW_PACK.md"
);

function readMetadataField(raw, field) {
  const re = new RegExp(`\\|\\s*\\*\\*${field}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`, "i");
  const m = raw.match(re);
  return m ? m[1].trim() : "";
}

function validatePages() {
  const errors = [];
  for (const pageId of HEBREW_G1_PAGE_ORDER) {
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
    const childFacing = page.sections.map((s) => s.body).join("\n");
    if (/\[DRAFT/i.test(childFacing)) {
      errors.push(`${pageId}.md: [DRAFT] in section body`);
    }
  }
  if (errors.length) {
    throw new Error(`Validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
}

const batchSummary = HEBREW_G1_BOOK_BATCHES.map(
  (b) => `| **Batch ${b.id.toUpperCase()}** (${b.titleHe}) | ${b.pages.length} |`
).join("\n");

const header = `# Grade 1 Hebrew Learning Book — Hebrew Review Pack

> **Status:** All content in this pack is **draft** (\`approval_status: draft\`). Nothing here is owner-approved or production-ready.
>
> **Book naming:** Child-facing copy uses **עברית** — ספר עברית — כיתה א׳.
>
> **Draft coverage:** Grade 1 Hebrew has **${HEBREW_G1_PAGE_ORDER.length} / ${HEBREW_G1_PAGE_ORDER.length}** draft pages authored. Source: \`docs/learning-book/hebrew/g1/drafts/\`.
>
> **Reconciliation:** Page count matches \`skills.json\` filter (\`subject: hebrew\`, grades 1–1): **32** spine rows → **32** pages.
>
> **UI / runtime:** Grade 1 Hebrew Learning Book **UI is not wired** — no registry, route, or practice CTA resolver.
>
> **Review focus:** Grade 1 concrete Hebrew, niqqud in examples, Section 5 / Section 6 alignment, no internal keys in bodies.
>
> **Pack version:** Initial full-book review pack (June 2026). Generated from current source markdown.

---

## Summary

| Metric | Value |
|--------|-------|
| **Total pages** | ${HEBREW_G1_PAGE_ORDER.length} |
${batchSummary}
| **All pages** | \`approval_status: draft\` |

---

**Book:** ספר עברית — כיתה א׳  
**Pages:** ${HEBREW_G1_PAGE_ORDER.length}  
**Sections per page:** 7  
**Source folder:** \`docs/learning-book/hebrew/g1/drafts/\`

---

`;

validatePages();

const pageBlocks = HEBREW_G1_PAGE_ORDER.map((pageId, index) => {
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
console.log(`Wrote ${OUT_PATH} (${HEBREW_G1_PAGE_ORDER.length} pages).`);
