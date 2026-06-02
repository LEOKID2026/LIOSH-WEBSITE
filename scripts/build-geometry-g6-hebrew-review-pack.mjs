/**
 * Regenerate docs/learning-book/GEOMETRY_GRADE_6_HEBREW_REVIEW_PACK.md from G6 geometry drafts.
 * Run: node scripts/build-geometry-g6-hebrew-review-pack.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  GEOMETRY_G6_PAGE_ORDER,
  GEOMETRY_G6_BOOK_BATCHES,
} from "./lib/geometry-g6-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/geometry/g6/drafts");
const OUT_PATH = path.join(
  __dirname,
  "../docs/learning-book/GEOMETRY_GRADE_6_HEBREW_REVIEW_PACK.md"
);

function readMetadataField(raw, field) {
  const re = new RegExp(`\\|\\s*\\*\\*${field}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`, "i");
  const m = raw.match(re);
  return m ? m[1].trim() : "";
}

function validatePages() {
  const errors = [];
  for (const pageId of GEOMETRY_G6_PAGE_ORDER) {
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
      errors.push(`${pageId}.md: title_hebrew missing DRAFT marker`);
    }
    if (readMetadataField(raw, "age_band") !== "grades_5_6") {
      errors.push(`${pageId}.md: age_band must be grades_5_6`);
    }
    if (readMetadataField(raw, "grade") !== "g6") {
      errors.push(`${pageId}.md: grade must be g6`);
    }
    const childFacing = page.sections.map((s) => s.body).join("\n");
    if (childFacing.includes("הנדסה")) {
      errors.push(`${pageId}.md: contains forbidden הנדסה in section body`);
    }
    if (/\bgeometry\b/i.test(childFacing)) {
      errors.push(`${pageId}.md: contains English geometry in section body`);
    }
  }
  if (errors.length) {
    throw new Error(`Validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`);
  }
}

const batchSummary = GEOMETRY_G6_BOOK_BATCHES.map(
  (b) => `| **Batch ${b.id.toUpperCase()}** (${b.titleHe}) | ${b.pages.length} |`
).join("\n");

const header = `# Grade 6 Geometry Learning Book — Hebrew Review Pack

> **Status:** All content in this pack is **draft** (\`approval_status: draft\`). Nothing here is owner-approved or production-ready.
>
> **Book title (child-facing):** ספר גאומטריה — כיתה ו׳
>
> **Draft coverage:** Grade 6 Geometry has **${GEOMETRY_G6_PAGE_ORDER.length} / ${GEOMETRY_G6_PAGE_ORDER.length}** draft pages (Batches A–G). Source: \`docs/learning-book/geometry/g6/drafts/\`.
>
> **UI / runtime:** Not wired — documentation for owner and Hebrew review only.
>
> **Review focus:** Grade 6 suitability, **גאומטריה** wording (not **הנדסה**), Section 5/6 alignment, notation/Bidi (ס״מ, סמ״ר, ס״מ³, °, π, √, labels A/B/C).

---

## Summary

| Metric | Value |
|--------|-------|
| **Total pages** | ${GEOMETRY_G6_PAGE_ORDER.length} |
${batchSummary}
| **All pages** | \`approval_status: draft\` |

---

**Book:** ספר גאומטריה — כיתה ו׳  
**Pages:** ${GEOMETRY_G6_PAGE_ORDER.length}  
**Sections per page:** 7  
**Source folder:** \`docs/learning-book/geometry/g6/drafts/\`

---

`;

validatePages();

const pageBlocks = GEOMETRY_G6_PAGE_ORDER.map((pageId, index) => {
  const raw = fs.readFileSync(path.join(DRAFTS_DIR, `${pageId}.md`), "utf8");
  const page = parseLearningPageMarkdown(raw, pageId);
  const titleHebrew = readMetadataField(raw, "title_hebrew") || page.metadata.title_hebrew;
  const learningPageId = readMetadataField(raw, "learning_page_id") || page.metadata.learning_page_id;
  const skillId = readMetadataField(raw, "skill_id") || page.metadata.skill_id;
  const approvalStatus = readMetadataField(raw, "approval_status") || page.metadata.approval_status;

  const metaTable = `## Page ${index + 1}: ${pageId}.md

| Field | Value |
|-------|-------|
| **File** | \`${pageId}.md\` |
| **learning_page_id** | \`${learningPageId.replace(/^`|`$/g, "")}\` |
| **skill_id** | \`${skillId.replace(/^`|`$/g, "")}\` |
| **title_hebrew** | ${titleHebrew} |
| **approval_status** | \`${approvalStatus.replace(/^`|`$/g, "")}\` |`;

  const sections = page.sections
    .map((section) => `### Section ${section.number}. ${section.title}\n\n${section.body.trim()}`)
    .join("\n\n---\n\n---\n\n");

  return `${metaTable}\n\n${sections}\n\n---\n`;
});

fs.writeFileSync(OUT_PATH, header + pageBlocks.join("\n"), "utf8");
console.log(`Wrote ${OUT_PATH} (${GEOMETRY_G6_PAGE_ORDER.length} pages).`);
