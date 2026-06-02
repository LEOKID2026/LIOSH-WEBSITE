/**
 * Verify Grade 4 Math learning book draft content (documentation only).
 * Run: node scripts/verify-math-g4-book-content.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  MATH_G4_PAGE_ORDER,
  MATH_G4_ALIGNMENT_ANCHORS,
} from "./lib/math-g4-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/math/g4/drafts");

const THOUSANDS_RE = /\d{1,3}(?:,\d{3})+/g;
const FAKE_PRACTICE_RE =
  /forceKind|fromBook=|math-master\?|resolveMathG4|getMathG4Practice/i;

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
const bidiNotes = [];

for (const pageId of MATH_G4_PAGE_ORDER) {
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

  if (readMetadataField(raw, "approval_status") !== "draft") {
    errors.push(`${pageId}: approval_status must be draft`);
  }
  if (!readMetadataField(raw, "title_hebrew").includes("[DRAFT")) {
    errors.push(`${pageId}: title_hebrew missing DRAFT marker`);
  }
  if (readMetadataField(raw, "grade") !== "g4") {
    errors.push(`${pageId}: grade must be g4`);
  }
  if (readMetadataField(raw, "age_band") !== "grades_3_4") {
    errors.push(`${pageId}: age_band must be grades_3_4`);
  }

  const learningPageId = readMetadataField(raw, "learning_page_id").replace(/^`|`$/g, "");
  const expectedId = `math:g4:${pageId}`;
  if (learningPageId !== expectedId) {
    errors.push(`${pageId}: learning_page_id must be ${expectedId} (found: ${learningPageId || "missing"})`);
  }

  const childFacing = page.sections.map((s) => s.body).join("\n");
  if (childFacing.includes("מתמטיקה")) {
    errors.push(`${pageId}: child-facing body contains מתמטיקה`);
  }
  if (/\[DRAFT/i.test(childFacing)) {
    errors.push(`${pageId}: [DRAFT] marker in child-facing section body`);
  }
  if (FAKE_PRACTICE_RE.test(childFacing)) {
    errors.push(`${pageId}: Section body contains fake practice routing`);
  }

  const s5 = sectionBody(page, 5);
  const s6 = sectionBody(page, 6);
  const s7 = sectionBody(page, 7);
  if (FAKE_PRACTICE_RE.test(s7)) {
    errors.push(`${pageId}: Section 7 contains fake practice routing`);
  }

  const anchors = MATH_G4_ALIGNMENT_ANCHORS[pageId] || [];
  for (const anchor of anchors) {
    if (!s5.includes(anchor)) {
      errors.push(`${pageId}: §5 missing alignment anchor "${anchor}"`);
    }
    if (!s6.includes(anchor)) {
      errors.push(`${pageId}: §6 missing alignment anchor "${anchor}"`);
    }
  }

  const thousands = childFacing.match(THOUSANDS_RE) || [];
  if (thousands.length) {
    bidiNotes.push(`${pageId}: grouped thousands ${[...new Set(thousands)].join(", ")}`);
  }
}

if (errors.length) {
  console.error("G4 content verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log(`G4 content verification PASSED: ${MATH_G4_PAGE_ORDER.length} pages.`);
console.log("- 7 sections each");
console.log("- draft metadata + math:g4:{pageId} ids");
console.log("- no מתמטיקה in body");
console.log("- Section 5/6 alignment anchors present");
console.log("- no fake practice routing in §7");
if (bidiNotes.length) {
  console.log("\nBidi review notes (grouped thousands — verify renderer in UI later):");
  for (const note of bidiNotes) {
    console.log(`  - ${note}`);
  }
} else {
  console.log("\nBidi review notes: no grouped thousands detected in child-facing bodies.");
}
