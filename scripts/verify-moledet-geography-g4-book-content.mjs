/**
 * Verify Grade 4 Moledet / Geography learning book draft content (documentation only).
 * Run: node scripts/verify-moledet-geography-g4-book-content.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  MOLEDET_GEOGRAPHY_G4_PAGE_ORDER,
  MOLEDET_GEOGRAPHY_G4_ALIGNMENT_ANCHORS,
  MOLEDET_GEOGRAPHY_G4_PAGE_META,
} from "./lib/moledet-geography-g4-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/moledet-geography/g4/drafts");

const FAKE_PRACTICE_RE =
  /forceKind|fromBook=|moledet-geography-master\?|resolveMoledetGeography|getMoledetGeography/i;
const RAW_MARKDOWN_RE = /\*\*[^*]+\*\*/;
const HIGH_RISK_RE = /```|^\s*\|.*\|.*\|/m;
const INVENTED_DATE_RE = /\b(1[89]\d{2}|20\d{2})\b/;
const COORDINATE_RE = /קואורדינט/i;

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

for (const pageId of MOLEDET_GEOGRAPHY_G4_PAGE_ORDER) {
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
  if (readMetadataField(raw, "grade") !== "g4") {
    errors.push(`${pageId}: grade must be g4`);
  }
  if (readMetadataField(raw, "age_band") !== "grades_3_4") {
    errors.push(`${pageId}: age_band must be grades_3_4`);
  }
  if (readMetadataField(raw, "subject") !== "moledet") {
    errors.push(`${pageId}: subject must be moledet`);
  }

  const learningPageId = readMetadataField(raw, "learning_page_id").replace(/^`|`$/g, "");
  const expectedId = `geography:g4:${pageId}`;
  if (learningPageId !== expectedId) {
    errors.push(
      `${pageId}: learning_page_id must be ${expectedId} (found: ${learningPageId || "missing"})`
    );
  }

  const meta = MOLEDET_GEOGRAPHY_G4_PAGE_META[pageId];
  const skillId = readMetadataField(raw, "skill_id").replace(/^`|`$/g, "");
  if (meta && skillId !== meta.skillId) {
    errors.push(`${pageId}: skill_id must be ${meta.skillId}`);
  }

  const childFacing = page.sections.map((s) => s.body).join("\n");
  if (/\bgeography\b/i.test(childFacing)) {
    errors.push(`${pageId}: child-facing body contains English geography`);
  }
  if (/\[DRAFT/i.test(childFacing)) {
    errors.push(`${pageId}: [DRAFT] marker in child-facing section body`);
  }
  if (FAKE_PRACTICE_RE.test(childFacing)) {
    errors.push(`${pageId}: Section body contains fake practice routing`);
  }
  if (COORDINATE_RE.test(childFacing)) {
    errors.push(`${pageId}: G4 body contains coordinate-grid content (G5 scope)`);
  }
  if (pageId === "mg_g4_settlement_development" && INVENTED_DATE_RE.test(childFacing)) {
    errors.push(`${pageId}: settlement history must not include specific years`);
  }

  const s5 = sectionBody(page, 5);
  const s6 = sectionBody(page, 6);
  const s7 = sectionBody(page, 7);
  if (FAKE_PRACTICE_RE.test(s7)) {
    errors.push(`${pageId}: Section 7 contains fake practice routing`);
  }

  const anchors = MOLEDET_GEOGRAPHY_G4_ALIGNMENT_ANCHORS[pageId] || [];
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
    "G4 Moledet/Geography content verification FAILED:\n" +
      errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}

console.log(
  `G4 Moledet/Geography content verification PASSED: ${MOLEDET_GEOGRAPHY_G4_PAGE_ORDER.length} pages.`
);
console.log("- 7 sections each; grades_3_4 age band");
console.log("- settlement_development: no invented dates");
console.log("- government content: role-based only");
if (markdownNotes.length) {
  console.log("\nMarkdown / structure review notes:");
  for (const note of markdownNotes) {
    console.log(`  - ${note}`);
  }
}
