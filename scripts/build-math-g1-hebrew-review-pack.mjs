/**
 * Regenerate docs/learning-book/MATH_GRADE_1_HEBREW_REVIEW_PACK.md from G1 drafts.
 * Run: node scripts/build-math-g1-hebrew-review-pack.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MATH_G1_PAGE_ORDER } from "../lib/learning-book/math-g1-registry.js";
import { parseLearningPageMarkdown } from "../lib/learning-book/parse-learning-page-markdown.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/math/g1/drafts");
const OUT_PATH = path.join(__dirname, "../docs/learning-book/MATH_GRADE_1_HEBREW_REVIEW_PACK.md");

function readMetadataField(raw, field) {
  const re = new RegExp(`\\|\\s*\\*\\*${field}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`, "i");
  const m = raw.match(re);
  return m ? m[1].trim() : "";
}

const header = `# Grade 1 Math Learning Book — Hebrew Review Pack

> **Status:** All content in this pack is **draft** (\`approval_status: draft\`). Nothing here is owner-approved or production-ready.
>
> **Hebrew titles:** Current \`title_hebrew\` values are **not final owner-approved** copy. They may include draft markers in source files; reviewers should treat titles as provisional.
>
> **Review purpose:** External Hebrew and pedagogical review for **Grade 1 suitability**, **clarity**, **examples**, **child-facing Hebrew**, and **conceptual accuracy**. After review, corrections will be applied file-by-file to the source drafts in \`docs/learning-book/math/g1/drafts/\`.
>
> **Pack version:** Post–Section 6 alignment fix (June 2026). Generated from current source markdown.

---

**Book:** ספר חשבון — כיתה א׳  
**Pages:** ${MATH_G1_PAGE_ORDER.length}  
**Sections per page:** 7  
**Source folder:** \`docs/learning-book/math/g1/drafts/\`

---

`;

const pageBlocks = MATH_G1_PAGE_ORDER.map((pageId, index) => {
  const raw = fs.readFileSync(path.join(DRAFTS_DIR, `${pageId}.md`), "utf8");
  const page = parseLearningPageMarkdown(raw, pageId);
  const titleHebrew = readMetadataField(raw, "title_hebrew") || page.metadata.title_hebrew;
  const learningPageId = readMetadataField(raw, "learning_page_id") || page.metadata.learning_page_id;
  const skillId = readMetadataField(raw, "skill_id") || page.metadata.skill_id;

  const metaTable = `## Page ${index + 1}: ${pageId}.md

| Field | Value |
|-------|-------|
| **File** | \`${pageId}.md\` |
| **learning_page_id** | \`${learningPageId.replace(/^`|`$/g, "")}\` |
| **skill_id** | \`${skillId.replace(/^`|`$/g, "")}\` |
| **title_hebrew** | ${titleHebrew} |`;

  const sections = page.sections
    .map((section) => {
      return `### Section ${section.number}. ${section.title}

${section.body.trim()}`;
    })
    .join("\n\n---\n\n---\n\n");

  return `${metaTable}\n\n${sections}\n\n---\n`;
});

fs.writeFileSync(OUT_PATH, header + pageBlocks.join("\n"), "utf8");
console.log(`Wrote ${OUT_PATH} (${MATH_G1_PAGE_ORDER.length} pages).`);
