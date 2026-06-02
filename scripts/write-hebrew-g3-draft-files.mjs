/**
 * Emit docs/learning-book/hebrew/g3/drafts/*.md from manifest + content.
 * Run: node scripts/write-hebrew-g3-draft-files.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  HEBREW_G3_PAGE_ORDER,
  HEBREW_G3_PAGE_META,
} from "./lib/hebrew-g3-draft-manifest.mjs";
import { getHebrewG3PageSections } from "./lib/hebrew-g3-page-content.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/hebrew/g3/drafts");

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
  const meta = HEBREW_G3_PAGE_META[pageId];
  const sections = getHebrewG3PageSections(pageId);
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
| **grade** | g3 |
| **age_band** | grades_3_4 |
| **page_type** | ${meta.pageType} |
| **approval_status** | draft |
| **title_hebrew** | ${meta.titleHe} \`[DRAFT — not owner-approved]\` |

**Source references:**
- \`data/curriculum-spine/v1/skills.json\`
- \`docs/learning-book/HEBREW_LEARNING_BOOK_MASTER_SCOPE_PLAN.md\`
- \`docs/learning-book/HEBREW_GRADE_3_LEARNING_BOOK_PLAN.md\`
- \`docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md\`

**Content scope:** ${meta.scope}

---

${sectionBlocks}`;
}

fs.mkdirSync(DRAFTS_DIR, { recursive: true });

for (const pageId of HEBREW_G3_PAGE_ORDER) {
  fs.writeFileSync(
    path.join(DRAFTS_DIR, `${pageId}.md`),
    buildPageMarkdown(pageId),
    "utf8"
  );
}

console.log(`Wrote ${HEBREW_G3_PAGE_ORDER.length} drafts to ${DRAFTS_DIR}`);
