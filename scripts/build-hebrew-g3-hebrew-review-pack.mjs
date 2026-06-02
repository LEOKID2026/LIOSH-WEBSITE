/**
 * Regenerate docs/learning-book/HEBREW_GRADE_3_HEBREW_REVIEW_PACK.md from G3 Hebrew drafts.
 * Run: node scripts/build-hebrew-g3-hebrew-review-pack.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  HEBREW_G3_PAGE_ORDER,
  HEBREW_G3_BOOK_BATCHES,
  HEBREW_G3_PAGE_META,
} from "./lib/hebrew-g3-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/hebrew/g3/drafts");
const OUT_PATH = path.join(
  __dirname,
  "../docs/learning-book/HEBREW_GRADE_3_HEBREW_REVIEW_PACK.md"
);

function readMetadataField(raw, field) {
  const re = new RegExp(`\\|\\s*\\*\\*${field}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`, "i");
  const m = raw.match(re);
  return m ? m[1].trim() : "";
}

function validatePages() {
  const errors = [];
  for (const pageId of HEBREW_G3_PAGE_ORDER) {
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
    const childFacing = page.sections.map((s) => s.body).join("\n");
    if (/\[DRAFT/i.test(childFacing)) {
      errors.push(`${pageId}.md: [DRAFT] in section body`);
    }
  }
  if (errors.length) {
    throw new Error(`Validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
}

const batchSummary = HEBREW_G3_BOOK_BATCHES.map(
  (b) => `| **Batch ${b.id.toUpperCase()}** (${b.titleHe}) | ${b.pages.length} |`
).join("\n");

const overlapNote = `## Overlap distinctions (owner review)

| Pair | Map / concept page | Rich / practice page | Distinction |
|------|-------------------|----------------------|-------------|
| Cause–effect | \`g3.cause_effect\` | \`comprehension_cause_effect_because\` | Idea (X leads to Y) vs finding כי/בגלל in text |
| Explicit reading | \`g3.explicit_only\` | \`comprehension_passage_explicit_detail\` | Rule (only written facts) vs locating a detail in passage |
| Verb family | \`g3.binyan_light\` | \`grammar_morphology_binyan_fit\` | Same-root forms intro vs choosing verb form in sentence |

`;

const header = `# Grade 3 Hebrew Learning Book — Hebrew Review Pack

> **Status:** All content in this pack is **draft** (\`approval_status: draft\`). Nothing here is owner-approved or production-ready.
>
> **Book:** ספר עברית — כיתה ג׳ (child-facing subject: עברית).
>
> **Draft coverage:** **${HEBREW_G3_PAGE_ORDER.length} / ${HEBREW_G3_PAGE_ORDER.length}** pages — matches \`skills.json\` G3 Hebrew filter.
>
> **UI / runtime:** Not wired — no registry, routes, or practice CTA.
>
> **Pack version:** Initial full-book review pack (June 2026). Generated from \`docs/learning-book/hebrew/g3/drafts/\`.

---

## Summary

| Metric | Value |
|--------|-------|
| **Total pages** | ${HEBREW_G3_PAGE_ORDER.length} |
${batchSummary}
| **All pages** | \`approval_status: draft\` |
| **age_band** | \`grades_3_4\` |

---

${overlapNote}

**Source folder:** \`docs/learning-book/hebrew/g3/drafts/\`

---

`;

validatePages();

const pageBlocks = HEBREW_G3_PAGE_ORDER.map((pageId, index) => {
  const raw = fs.readFileSync(path.join(DRAFTS_DIR, `${pageId}.md`), "utf8");
  const page = parseLearningPageMarkdown(raw, pageId);
  const meta = HEBREW_G3_PAGE_META[pageId];
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
| **approval_status** | \`${approvalStatus.replace(/^`|`$/g, "")}\` |
| **Overlap note** | ${meta.scope} |`;

  const sections = page.sections
    .map((section) => {
      return `### Section ${section.number}. ${section.title}

${section.body.trim()}`;
    })
    .join("\n\n---\n\n---\n\n");

  return `${metaTable}\n\n${sections}\n\n---\n`;
});

fs.writeFileSync(OUT_PATH, header + pageBlocks.join("\n"), "utf8");
console.log(`Wrote ${OUT_PATH} (${HEBREW_G3_PAGE_ORDER.length} pages).`);
