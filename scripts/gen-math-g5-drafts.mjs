#!/usr/bin/env node
/**
 * Generate Grade 5 math learning book draft markdown pages.
 * Output: docs/learning-book/math/g5/drafts/{pageId}.md
 */

import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  MATH_G5_ALIGNMENT_ANCHORS,
  MATH_G5_PAGE_META,
  MATH_G5_PAGE_ORDER,
} from "./lib/math-g5-draft-manifest.mjs";
import { MATH_G5_DRAFT_CONTENT } from "./lib/math-g5-draft-content.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../docs/learning-book/math/g5/drafts");

const SOURCE_REFS = `- \`data/curriculum-spine/v1/skills.json\`
- \`docs/learning-book/MATH_LEARNING_BOOK_CURRICULUM_MAP.md\`
- \`docs/learning-book/MATH_LEARNING_PAGE_TEMPLATE.md\``;

const SECTION_TITLES = [
  "מה לומדים?",
  "הסבר",
  "דוגמה",
  "בואו נפתור",
  "נסו בעצמכם",
  "שימו לב!",
  "בואו נתרגל!",
];

/** @param {string} pageId */
function buildPageMarkdown(pageId) {
  const meta = MATH_G5_PAGE_META[pageId];
  const content = MATH_G5_DRAFT_CONTENT[pageId];
  if (!meta) throw new Error(`Missing meta for page: ${pageId}`);
  if (!content) throw new Error(`Missing content for page: ${pageId}`);

  const anchors = MATH_G5_ALIGNMENT_ANCHORS[pageId] ?? [];
  for (const anchor of anchors) {
    if (!content.s5.includes(anchor)) {
      throw new Error(`${pageId}: anchor "${anchor}" missing from section 5`);
    }
    if (!content.s6.includes(anchor)) {
      throw new Error(`${pageId}: anchor "${anchor}" missing from section 6`);
    }
  }

  const sections = [content.s1, content.s2, content.s3, content.s4, content.s5, content.s6, content.s7]
    .map((body, i) => `## ${i + 1}. ${SECTION_TITLES[i]}\n\n${body.trim()}`)
    .join("\n\n---\n\n");

  return `# ${meta.titleHe}

## Metadata

| Field | Value |
|-------|-------|
| **learning_page_id** | \`math:g5:${pageId}\` |
| **skill_id** | \`${meta.skillId}\` |
| **subject** | math |
| **grade** | g5 |
| **age_band** | grades_5_6 |
| **page_type** | ${meta.pageType} |
| **approval_status** | draft |
| **title_hebrew** | ${meta.titleHe} \`[DRAFT — not owner-approved]\` |

**Source references:**
${SOURCE_REFS}

**Content scope:** ${meta.scope}

---

${sections}
`;
}

function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const written = [];
  const issues = [];

  for (const pageId of MATH_G5_PAGE_ORDER) {
    try {
      const md = buildPageMarkdown(pageId);
      writeFileSync(join(OUT_DIR, `${pageId}.md`), md, "utf8");
      written.push(pageId);
    } catch (err) {
      issues.push(`${pageId}: ${err.message}`);
    }
  }

  console.log(`Wrote ${written.length}/${MATH_G5_PAGE_ORDER.length} draft pages to ${OUT_DIR}`);
  if (issues.length) {
    console.error("Issues:");
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exit(1);
  }
}

main();
