/**
 * Verify Grade 4 Geometry learning book draft content (documentation only).
 * Run: node scripts/verify-geometry-g4-book-content.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  GEOMETRY_G4_PAGE_ORDER,
  GEOMETRY_G4_ALIGNMENT_ANCHORS,
} from "./lib/geometry-g4-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/geometry/g4/drafts");

const FAKE_PRACTICE_RE =
  /forceKind|fromBook=|geometry-master\?|resolveGeometryG4|getGeometryG4Practice/i;
const RAW_MD_RE = /```|^\|.+\|$/m;
const VISIBLE_DRAFT_RE = /\[DRAFT/i;
const DEGREE_RE = /\d+Â°/g;
const CM_RE = /\d+\s*×¡[×´"]?×ž/g;
const CM3_RE = /×¡[×´"]?×žÂ³|×¡×´×ž ×ž×¢×•×§×‘/g;
const MULT_RE = /\d+\s*Ã—\s*\d+/g;
const FORMULA_RE = /P\s*=\s*|S\s*=\s*|× ×¤×—\s*=\s*××•×¨×š/g;
const SHAPE_LABEL_RE = /\b[ABC]\b(?=\s*[=â€”â€“-]|\s*× ×§×•×“×”)/g;
const FRACTION_RE = /\d+\s*\/\s*\d+/g;

function readMetadataField(raw, field) {
  const re = new RegExp(`\\|\\s*\\*\\*${field}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`, "i");
  const m = raw.match(re);
  return m ? m[1].trim() : "";
}

function sectionBody(page, num) {
  const s = page.sections.find((x) => x.number === num);
  return s ? s.body : "";
}

function uniqueMatches(re, text) {
  const m = text.match(re);
  return m ? [...new Set(m)] : [];
}

function pushNote(bucket, pageId, label, tokens) {
  if (tokens.length) bucket.push(`${pageId}: ${label} ${tokens.join(", ")}`);
}

const errors = [];
const notationNotes = [];

for (const pageId of GEOMETRY_G4_PAGE_ORDER) {
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

  if (readMetadataField(raw, "approval_status") !== "launch_ready") {
    errors.push(`${pageId}: approval_status must be launch_ready`);
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
  const expectedId = `geometry:g4:${pageId}`;
  if (learningPageId !== expectedId) {
    errors.push(
      `${pageId}: learning_page_id must be ${expectedId} (found: ${learningPageId || "missing"})`
    );
  }

  const childFacing = page.sections.map((s) => s.body).join("\n");
  const childFacingNoDiagramDirectives = childFacing.replace(
    /:::geometry-diagram[\s\S]*?:::/g,
    ""
  );
  if (childFacing.includes("×”× ×“×¡×”")) {
    errors.push(`${pageId}: child-facing body must use ×’××•×ž×˜×¨×™×”, not ×”× ×“×¡×”`);
  }
  if (/\bgeometry\b/i.test(childFacingNoDiagramDirectives)) {
    errors.push(`${pageId}: child-facing body contains English geometry`);
  }
  if (VISIBLE_DRAFT_RE.test(childFacing)) {
    errors.push(`${pageId}: [DRAFT] marker in child-facing section body`);
  }
  if (FAKE_PRACTICE_RE.test(childFacing)) {
    errors.push(`${pageId}: Section body contains fake practice routing`);
  }
  if (RAW_MD_RE.test(childFacing)) {
    errors.push(`${pageId}: code fence or markdown table in child-facing body`);
  }

  const s5 = sectionBody(page, 5);
  const s6 = sectionBody(page, 6);
  const s7 = sectionBody(page, 7);
  if (FAKE_PRACTICE_RE.test(s7)) {
    errors.push(`${pageId}: Section 7 contains fake practice routing`);
  }
  if (!/בתרגול/u.test(s7)) {
    errors.push(`${pageId}: Section 7 must use "בתרגול…" (no fake links)`);
  }

  const anchors = GEOMETRY_G4_ALIGNMENT_ANCHORS[pageId] || [];
  for (const anchor of anchors) {
    if (!s5.includes(anchor)) {
      errors.push(`${pageId}: §5 missing alignment anchor "${anchor}"`);
    }
    if (!s6.includes(anchor)) {
      errors.push(`${pageId}: §6 missing alignment anchor "${anchor}"`);
    }
  }

  const parts = [];
  const degrees = uniqueMatches(DEGREE_RE, childFacing);
  const cms = uniqueMatches(CM_RE, childFacing);
  const cm3 = uniqueMatches(CM3_RE, childFacing);
  const mults = uniqueMatches(MULT_RE, childFacing);
  const formulas = uniqueMatches(FORMULA_RE, childFacing);
  const labels = uniqueMatches(SHAPE_LABEL_RE, childFacing);
  const fracs = uniqueMatches(FRACTION_RE, childFacing);
  if (degrees.length) parts.push(`degrees: ${degrees.join(", ")}`);
  if (cms.length) parts.push(`length units: ${cms.join(", ")}`);
  if (cm3.length) parts.push(`volume units: ${cm3.join(", ")}`);
  if (mults.length) parts.push(`multiply: ${mults.join(", ")}`);
  if (formulas.length) parts.push(`formulas: ${formulas.join(", ")}`);
  if (labels.length) parts.push(`shape labels: ${labels.join(", ")}`);
  if (fracs.length) parts.push(`fractions: ${fracs.join(", ")}`);
  if (parts.length) notationNotes.push(`${pageId}: ${parts.join("; ")} (Bidi review at runtime)`);
}

if (errors.length) {
  console.error(
    "G4 Geometry content verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}

console.log(`G4 Geometry content verification PASSED: ${GEOMETRY_G4_PAGE_ORDER.length} pages.`);
console.log("- 7 sections each");
console.log("- draft metadata + geometry:g4:{pageId} ids");
console.log("- ×’××•×ž×˜×¨×™×” wording; no ×”× ×“×¡×” / English geometry");
console.log("- Section 5/6 alignment anchors present");
console.log("- no fake practice routing in Â§7");
if (notationNotes.length) {
  console.log("\nNotation / Bidi review notes (verify renderer in UI later):");
  for (const note of notationNotes) {
    console.log(`  - ${note}`);
  }
} else {
  console.log("\nNotation / Bidi review notes: none detected.");
}
