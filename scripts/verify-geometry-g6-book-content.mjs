/**
 * Verify Grade 6 Geometry learning book draft content (documentation only).
 * Run: node scripts/verify-geometry-g6-book-content.mjs
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
  GEOMETRY_G6_ALIGNMENT_ANCHORS,
} from "./lib/geometry-g6-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/geometry/g6/drafts");

const FAKE_PRACTICE_RE =
  /forceKind|fromBook=|geometry-master\?|resolveGeometryG6|getGeometryG6Practice/i;
const RAW_MD_RE = /```|^\|.+\|$/m;
const VISIBLE_DRAFT_RE = /\[DRAFT/i;

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
  volumeUnits: [],
  angles: [],
  formulas: [],
  multiply: [],
  shapeLabels: [],
  sqrt: [],
  piDecimals: [],
  powers: [],
  fractions: [],
};

for (const pageId of GEOMETRY_G6_PAGE_ORDER) {
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
  if (readMetadataField(raw, "grade") !== "g6") {
    errors.push(`${pageId}: grade must be g6`);
  }
  if (readMetadataField(raw, "age_band") !== "grades_5_6") {
    errors.push(`${pageId}: age_band must be grades_5_6`);
  }

  const learningPageId = readMetadataField(raw, "learning_page_id").replace(/^`|`$/g, "");
  const expectedId = `geometry:g6:${pageId}`;
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

  const anchors = GEOMETRY_G6_ALIGNMENT_ANCHORS[pageId] || [];
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
  pushNote(
    notationByCategory.volumeUnits,
    pageId,
    uniqueMatches(/×¡×´×žÂ³|×¡×ž×´×§|×ž×´×§/g, childFacing)
  );
  pushNote(notationByCategory.angles, pageId, uniqueMatches(/\d+Â°/g, childFacing));
  pushNote(
    notationByCategory.formulas,
    pageId,
    uniqueMatches(/âˆš\([^)]+\)|âˆš\d+|\([^)]+\)\s*Ã—\s*[^Ã·]+Ã·\s*2|\(1\/3\)|\(4\/3\)/g, childFacing)
  );
  pushNote(notationByCategory.multiply, pageId, uniqueMatches(/Ã—/g, childFacing));
  pushNote(notationByCategory.shapeLabels, pageId, uniqueMatches(/\b[A-D]{1,2}\b/g, childFacing));
  pushNote(notationByCategory.sqrt, pageId, uniqueMatches(/âˆš2|âˆš\d+/g, childFacing));
  pushNote(notationByCategory.piDecimals, pageId, uniqueMatches(/3\.14|\d+\.\d+/g, childFacing));
  pushNote(notationByCategory.powers, pageId, uniqueMatches(/\d+Â²|\d+Â³|rÂ²|rÂ³/g, childFacing));
  pushNote(notationByCategory.fractions, pageId, uniqueMatches(/â…“|Ã·\s*2|Ã·\s*3/g, childFacing));

  if (RAW_MD_RE.test(childFacing)) {
    errors.push(`${pageId}: raw markdown structure in child-facing body`);
  }
}

if (errors.length) {
  console.error("G6 geometry content verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log(`G6 geometry content verification PASSED: ${GEOMETRY_G6_PAGE_ORDER.length} pages.`);
console.log("- 7 sections each");
console.log("- draft metadata + geometry:g6:{pageId} ids");
console.log("- no ×”× ×“×¡×” / English geometry in body");
console.log("- Section 5/6 alignment anchors present");
console.log("- no fake practice routing in Â§7");

const notationLabels = {
  lengthUnits: "Length units (×¡×´×ž â€” verify Bidi in browser)",
  areaUnits: "Area units (×¡×ž×´×¨ / ×ž×´×¨ â€” verify Bidi in browser)",
  volumeUnits: "Volume units (×¡×´×žÂ³ / ×¡×ž×´×§ / ×ž×´×§ â€” verify Bidi in browser)",
  angles: "Angle notation (e.g. 90Â°, 180Â° â€” verify Â° placement)",
  formulas: "Formulas / parentheses (verify LTR isolation)",
  multiply: "Multiplication sign (Ã— â€” verify spacing and direction)",
  shapeLabels: "Shape vertex labels (A, B, C â€” verify LTR)",
  sqrt: "Square-root notation (âˆš25, âˆš100 â€” verify rendering)",
  piDecimals: "Pi / decimal measurements (3.14, 31.4 â€” verify LTR)",
  powers: "Powers / squares (Â², Â³, rÂ² â€” verify rendering)",
  fractions: "Fractions / division steps (â…“, Ã·2, Ã·3 â€” verify direction)",
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
