/**
 * Verify Grade 2 English learning book draft content (documentation only).
 * Run: node scripts/verify-english-g2-book-content.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  ENGLISH_G2_PAGE_ORDER,
  ENGLISH_G2_ALIGNMENT_ANCHORS,
  ENGLISH_G2_PAGE_META,
} from "./lib/english-g2-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/english/g2/drafts");

const FAKE_PRACTICE_RE =
  /forceKind|fromBook=|english-master\?|resolveEnglish|getEnglishPractice|href=|http/i;
const RAW_MARKDOWN_RE = /\*\*[^*]+\*\*/;
const HIGH_RISK_RE = /```|^\s*\|.*\|.*\|/m;
const INTERNAL_KEY_RE = /english:(pool|grammar|vocabulary|g2)|spine_layer|skill_id/i;

function readMetadataField(raw, field) {
  const re = new RegExp(`\\|\\s*\\*\\*${field}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`, "i");
  const m = raw.match(re);
  return m ? m[1].trim() : "";
}

function sectionBody(page, num) {
  const s = page.sections.find((x) => x.number === num);
  return s ? s.body : "";
}

const errors = [];
const markdownNotes = [];

for (const pageId of ENGLISH_G2_PAGE_ORDER) {
  const filePath = path.join(DRAFTS_DIR, `${pageId}.md`);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing: ${pageId}.md`);
    continue;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const page = parseLearningPageMarkdown(raw, pageId);

  try {
    assertMathG1PageSections(page);
  } catch (e) {
    errors.push(e.message);
  }

  if (readMetadataField(raw, "approval_status") !== "approved") {
    errors.push(`${pageId}: approval_status must be approved`);
  }
  if (readMetadataField(raw, "title_hebrew").includes("[DRAFT")) {
    errors.push(`${pageId}: title_hebrew must not include DRAFT marker`);
  }
  if (readMetadataField(raw, "grade") !== "g2") {
    errors.push(`${pageId}: grade must be g2`);
  }
  if (readMetadataField(raw, "subject") !== "english") {
    errors.push(`${pageId}: subject must be english`);
  }
  if (readMetadataField(raw, "age_band") !== "grades_1_2") {
    errors.push(`${pageId}: age_band must be grades_1_2`);
  }

  const learningPageId = readMetadataField(raw, "learning_page_id").replace(/^`|`$/g, "");
  const expectedId = `english:g2:${pageId}`;
  if (learningPageId !== expectedId) {
    errors.push(
      `${pageId}: learning_page_id must be ${expectedId} (found: ${learningPageId || "missing"})`
    );
  }

  const meta = ENGLISH_G2_PAGE_META[pageId];
  const skillId = readMetadataField(raw, "skill_id").replace(/^`|`$/g, "");
  if (meta && skillId !== meta.skillId) {
    errors.push(`${pageId}: skill_id must be ${meta.skillId} (found: ${skillId || "missing"})`);
  }

  const childFacing = page.sections.map((s) => s.body).join("\n");
  if (/\[DRAFT/i.test(childFacing)) {
    errors.push(`${pageId}: [DRAFT] marker in child-facing section body`);
  }
  if (FAKE_PRACTICE_RE.test(childFacing)) {
    errors.push(`${pageId}: Section body contains fake practice routing`);
  }
  if (INTERNAL_KEY_RE.test(childFacing)) {
    errors.push(`${pageId}: internal key/metadata leak in child-facing body`);
  }

  const s5 = sectionBody(page, 5);
  const s6 = sectionBody(page, 6);
  const s7 = sectionBody(page, 7);
  if (FAKE_PRACTICE_RE.test(s7)) {
    errors.push(`${pageId}: Section 7 contains fake practice routing`);
  }

  const anchors = ENGLISH_G2_ALIGNMENT_ANCHORS[pageId] || [];
  for (const anchor of anchors) {
    if (!s5.includes(anchor)) {
      errors.push(`${pageId}: §5 missing alignment anchor "${anchor}"`);
    }
    if (!s6.includes(anchor)) {
      errors.push(`${pageId}: §6 missing alignment anchor "${anchor}"`);
    }
  }

  if (RAW_MARKDOWN_RE.test(childFacing)) {
    markdownNotes.push(`${pageId}: possible raw ** markdown in child-facing body`);
  }
  if (HIGH_RISK_RE.test(childFacing)) {
    markdownNotes.push(`${pageId}: code fence or table-like structure in child-facing body`);
  }
}

if (errors.length) {
  console.error(
    "G2 English content verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}

console.log(`G2 English content verification PASSED: ${ENGLISH_G2_PAGE_ORDER.length} pages.`);
console.log("- 7 sections each");
console.log("- draft metadata + english:g2:{pageId} ids");
console.log("- Hebrew explanations; English examples where needed");
console.log("- Section 5/6 alignment anchors present");
console.log("- no fake practice routing in §7");
if (markdownNotes.length) {
  console.log("\nMarkdown / structure review notes:");
  for (const note of markdownNotes) {
    console.log(`  - ${note}`);
  }
} else {
  console.log("\nMarkdown / structure review notes: none.");
}
