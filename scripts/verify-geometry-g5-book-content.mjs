/**
 * Verify Grade 5 Geometry learning book draft content (documentation only).
 * Run: node scripts/verify-geometry-g5-book-content.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  GEOMETRY_G5_PAGE_ORDER,
  GEOMETRY_G5_ALIGNMENT_ANCHORS,
} from "./lib/geometry-g5-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/geometry/g5/drafts");

const FAKE_PRACTICE_RE =
  /forceKind|fromBook=|geometry-master\?|resolveGeometryG5|getGeometryG5Practice/i;
const RAW_MD_RE = /```|^\|.+\|$/m;
const VISIBLE_DRAFT_RE = /\[DRAFT/i;
/** Cyrillic must not appear in child-facing Hebrew section bodies */
const CYRILLIC_IN_CHILD_FACING_RE = /[\u0400-\u04FF]/;

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

function pushNote(bucket, pageId, tokens) {
  if (tokens.length) bucket.push(`${pageId}: ${tokens.join(", ")}`);
}

const errors = [];
const notationByCategory = {
  lengthUnits: [],
  areaUnits: [],
  angles: [],
  formulas: [],
  multiply: [],
  shapeLabels: [],
  sqrt: [],
};

for (const pageId of GEOMETRY_G5_PAGE_ORDER) {
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
  if (readMetadataField(raw, "grade") !== "g5") {
    errors.push(`${pageId}: grade must be g5`);
  }
  if (readMetadataField(raw, "age_band") !== "grades_5_6") {
    errors.push(`${pageId}: age_band must be grades_5_6`);
  }

  const learningPageId = readMetadataField(raw, "learning_page_id").replace(/^`|`$/g, "");
  const expectedId = `geometry:g5:${pageId}`;
  if (learningPageId !== expectedId) {
    errors.push(`${pageId}: learning_page_id must be ${expectedId} (found: ${learningPageId || "missing"})`);
  }

  const childFacing = page.sections.map((s) => s.body).join("\n");
  const childFacingNoDiagramDirectives = childFacing.replace(
    /:::geometry-diagram[\s\S]*?:::/g,
    ""
  );
  if (childFacing.includes("×”× ×“×¡×”")) {
    errors.push(`${pageId}: child-facing body must use ×’××•×ž×˜×¨×™×”, not ×”× ×“×¡×”`);
  }
  const cyrillicHits = childFacing.match(CYRILLIC_IN_CHILD_FACING_RE);
  if (cyrillicHits) {
    const unique = [...new Set(cyrillicHits)];
    errors.push(
      `${pageId}: child-facing body contains foreign (Cyrillic) letters: ${unique.join(", ")}`
    );
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

  const s5 = sectionBody(page, 5);
  const s6 = sectionBody(page, 6);
  const s7 = sectionBody(page, 7);
  if (FAKE_PRACTICE_RE.test(s7)) {
    errors.push(`${pageId}: Section 7 contains fake practice routing`);
  }

  const anchors = GEOMETRY_G5_ALIGNMENT_ANCHORS[pageId] || [];
  for (const anchor of anchors) {
    if (!s5.includes(anchor)) {
      errors.push(`${pageId}: Â§5 missing alignment anchor "${anchor}"`);
    }
    if (!s6.includes(anchor)) {
      errors.push(`${pageId}: Â§6 missing alignment anchor "${anchor}"`);
    }
  }

  pushNote(notationByCategory.lengthUnits, pageId, uniqueMatches(/×¡×´×ž/g, childFacing));
  pushNote(
    notationByCategory.areaUnits,
    pageId,
    uniqueMatches(/×¡×ž×´×¨|×ž×´×¨/g, childFacing)
  );
  pushNote(notationByCategory.angles, pageId, uniqueMatches(/\d+Â°/g, childFacing));
  pushNote(
    notationByCategory.formulas,
    pageId,
    uniqueMatches(/âˆš\([^)]+\)|âˆš\d+|\([^)]+\)\s*Ã—\s*[^Ã·]+Ã·\s*2/g, childFacing)
  );
  pushNote(notationByCategory.multiply, pageId, uniqueMatches(/Ã—/g, childFacing));
  pushNote(notationByCategory.shapeLabels, pageId, uniqueMatches(/\b[A-D]{1,2}\b/g, childFacing));
  pushNote(notationByCategory.sqrt, pageId, uniqueMatches(/âˆš2|âˆš\d+/g, childFacing));

  if (RAW_MD_RE.test(childFacing)) {
    errors.push(`${pageId}: raw markdown structure in child-facing body`);
  }
}

if (errors.length) {
  console.error("G5 geometry content verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log(`G5 geometry content verification PASSED: ${GEOMETRY_G5_PAGE_ORDER.length} pages.`);
console.log("- 7 sections each");
console.log("- draft metadata + geometry:g5:{pageId} ids");
console.log("- no ×”× ×“×¡×” / English geometry / Cyrillic in child-facing body");
console.log("- Section 5/6 alignment anchors present");
console.log("- no fake practice routing in Â§7");

const notationLabels = {
  lengthUnits: "Length units (×¡×´×ž â€” verify Bidi in browser)",
  areaUnits: "Area units (×¡×ž×´×¨ / ×ž×´×¨ â€” verify Bidi in browser)",
  angles: "Angle notation (e.g. 90Â°, 60Â° â€” verify Â° placement)",
  formulas: "Formulas / parentheses (verify LTR isolation)",
  multiply: "Multiplication sign (Ã— â€” verify spacing and direction)",
  shapeLabels: "Shape vertex labels (A, B, C, D â€” verify LTR)",
  sqrt: "Square-root notation (âˆš2, âˆš100 â€” verify rendering)",
};

let anyNotation = false;
for (const [key, label] of Object.entries(notationLabels)) {
  const notes = notationByCategory[key];
  if (notes.length) {
    anyNotation = true;
    console.log(`\nNotation / Bidi review â€” ${label}:`);
    for (const note of notes) {
      console.log(`  - ${note}`);
    }
  }
}
if (!anyNotation) {
  console.log("\nNotation / Bidi review: no flagged tokens detected.");
}
