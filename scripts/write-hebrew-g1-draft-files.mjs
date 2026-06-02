/**
 * One-shot writer: emit docs/learning-book/hebrew/g1/drafts/*.md from manifest + content.
 * Run: node scripts/write-hebrew-g1-draft-files.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  HEBREW_G1_PAGE_ORDER,
  HEBREW_G1_PAGE_META,
} from "./lib/hebrew-g1-draft-manifest.mjs";
import { getHebrewG1PageSections } from "./lib/hebrew-g1-page-content.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/hebrew/g1/drafts");

const SECTION_HEADERS = [
  "מה לומדים?",
  "הסבר",
  "דוגמה",
  "בואו נפתור",
  "נסו בעצמכם",
  "שימו לב!",
  "בואו נתרגל!",
];

function buildPageMarkdown(pageId) {
  const meta = HEBREW_G1_PAGE_META[pageId];
  const sections = getHebrewG1PageSections(pageId);
  const sectionBlocks = SECTION_HEADERS.map((title, i) => {
    const key = `s${i + 1}`;
    return `## ${i + 1}. ${title}\n\n${sections[key].trim()}\n\n---\n`;
  }).join("\n");

  return `# ${meta.titleHe}

## Metadata

| Field | Value |
|-------|-------|
| **learning_page_id** | \`${meta.learningPageId}\` |
| **skill_id** | \`${meta.skillId}\` |
| **subject** | hebrew |
| **grade** | g1 |
| **age_band** | grades_1_2 |
| **page_type** | ${meta.pageType} |
| **approval_status** | draft |
| **title_hebrew** | ${meta.titleHe} \`[DRAFT — not owner-approved]\` |

**Source references:**
- \`data/curriculum-spine/v1/skills.json\`
- \`docs/learning-book/HEBREW_LEARNING_BOOK_MASTER_SCOPE_PLAN.md\`
- \`docs/learning-book/HEBREW_GRADE_1_LEARNING_BOOK_PLAN.md\`
- \`docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md\`

**Content scope:** ${meta.scope}

---

${sectionBlocks}`;
}

fs.mkdirSync(DRAFTS_DIR, { recursive: true });

for (const pageId of HEBREW_G1_PAGE_ORDER) {
  const out = path.join(DRAFTS_DIR, `${pageId}.md`);
  fs.writeFileSync(out, buildPageMarkdown(pageId), "utf8");
}

console.log(`Wrote ${HEBREW_G1_PAGE_ORDER.length} drafts to ${DRAFTS_DIR}`);
