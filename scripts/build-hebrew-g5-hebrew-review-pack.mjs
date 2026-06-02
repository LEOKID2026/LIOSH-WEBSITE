/**
 * Regenerate docs/learning-book/HEBREW_GRADE_5_HEBREW_REVIEW_PACK.md from G5 Hebrew drafts.
 * Run: node scripts/build-hebrew-g5-hebrew-review-pack.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  HEBREW_G5_PAGE_ORDER,
  HEBREW_G5_BOOK_BATCHES,
  HEBREW_G5_PAGE_META,
} from "./lib/hebrew-g5-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/hebrew/g5/drafts");
const OUT_PATH = path.join(
  __dirname,
  "../docs/learning-book/HEBREW_GRADE_5_HEBREW_REVIEW_PACK.md"
);

function readMetadataField(raw, field) {
  const re = new RegExp(`\\|\\s*\\*\\*${field}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`, "i");
  const m = raw.match(re);
  return m ? m[1].trim() : "";
}

function validatePages() {
  const errors = [];
  for (const pageId of HEBREW_G5_PAGE_ORDER) {
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
    const childFacing = page.sections.map((s) => s.body).join("\n");
    if (/\[DRAFT/i.test(childFacing)) {
      errors.push(`${pageId}.md: [DRAFT] in section body`);
    }
  }
  if (errors.length) {
    throw new Error(`Validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
}

const batchSummary = HEBREW_G5_BOOK_BATCHES.map(
  (b) => `| **Batch ${b.id.toUpperCase()}** (${b.titleHe}) | ${b.pages.length} |`
).join("\n");

const distinctionNote = `## Reading vs writing / argument (owner review)

| Page | Strand | Note |
|------|--------|------|
| \`g5.inference\` | comprehension | Strategy — מסקנה מרמזים |
| \`comprehension_main_idea_summary\` | comprehension | Product — משפט מסכם |
| \`g5.full_composition_scaffold_choice\` | writing | Full essay structure |
| \`g5.argument_scaffold_choice\` | speaking | טענה + נימוק scaffold (not full composition) |
| \`grammar_sentence_correction_choose_correct\` | grammar | General correct sentence |
| \`grammar_sentence_correction_sv_agreement_plural\` | grammar | Plural subject–verb only |

`;

const header = `# Grade 5 Hebrew Learning Book — Hebrew Review Pack

> **Status:** All content **draft**. Not owner-approved.
>
> **Book:** ספר עברית — כיתה ה׳ (עברית).
>
> **Coverage:** **${HEBREW_G5_PAGE_ORDER.length} / ${HEBREW_G5_PAGE_ORDER.length}** pages — matches \`skills.json\` G5 Hebrew (\`minGrade ≤ 5\`, \`maxGrade ≥ 5\`).
>
> **Note:** At G5 all spine rows are \`minGrade: 5\`, \`maxGrade: 5\` (rich 5–6 band rows also appear in G6 book with deeper pages).
>
> **UI / runtime:** Not wired.

---

## Summary

| Metric | Value |
|--------|-------|
| **Total pages** | ${HEBREW_G5_PAGE_ORDER.length} |
${batchSummary}
| **age_band** | \`grades_5_6\` |

---

${distinctionNote}

**Source:** \`docs/learning-book/hebrew/g5/drafts/\`

---

`;

validatePages();

const pageBlocks = HEBREW_G5_PAGE_ORDER.map((pageId, index) => {
  const raw = fs.readFileSync(path.join(DRAFTS_DIR, `${pageId}.md`), "utf8");
  const page = parseLearningPageMarkdown(raw, pageId);
  const meta = HEBREW_G5_PAGE_META[pageId];
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
| **Scope** | ${meta.scope} |`;

  const sections = page.sections
    .map((section) => {
      return `### Section ${section.number}. ${section.title}

${section.body.trim()}`;
    })
    .join("\n\n---\n\n---\n\n");

  return `${metaTable}\n\n${sections}\n\n---\n`;
});

fs.writeFileSync(OUT_PATH, header + pageBlocks.join("\n"), "utf8");
console.log(`Wrote ${OUT_PATH} (${HEBREW_G5_PAGE_ORDER.length} pages).`);
