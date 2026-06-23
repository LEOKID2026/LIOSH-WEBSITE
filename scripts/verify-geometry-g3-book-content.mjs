/**
 * Verify Grade 3 Geometry learning book draft content (documentation only).
 * Run: node scripts/verify-geometry-g3-book-content.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  GEOMETRY_G3_PAGE_ORDER,
  GEOMETRY_G3_ALIGNMENT_ANCHORS,
} from "./lib/geometry-g3-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/geometry/g3/drafts");

const FAKE_PRACTICE_RE =
  /forceKind|fromBook=|geometry-master\?|resolveGeometryG3|getGeometryG3Practice/i;
const RAW_MARKDOWN_RE = /\*\*[^*]+\*\*/;
const HIGH_RISK_RE = /```|^\s*\|.*\|.*\|/m;
const DEGREE_RE = /\d+Â°/g;
const CM_RE = /\d+\s*×¡[×´"]?×ž/g;
const MULT_RE = /\d+\s*Ã—\s*\d+/g;

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
const notationNotes = [];
const markdownNotes = [];

for (const pageId of GEOMETRY_G3_PAGE_ORDER) {
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
  if (readMetadataField(raw, "grade") !== "g3") {
    errors.push(`${pageId}: grade must be g3`);
  }
  if (readMetadataField(raw, "age_band") !== "grades_3_4") {
    errors.push(`${pageId}: age_band must be grades_3_4`);
  }

  const learningPageId = readMetadataField(raw, "learning_page_id").replace(/^`|`$/g, "");
  const expectedId = `geometry:g3:${pageId}`;
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

  const anchors = GEOMETRY_G3_ALIGNMENT_ANCHORS[pageId] || [];
  for (const anchor of anchors) {
    if (!s5.includes(anchor)) {
      errors.push(`${pageId}: Â§5 missing alignment anchor "${anchor}"`);
    }
    if (!s6.includes(anchor)) {
      errors.push(`${pageId}: Â§6 missing alignment anchor "${anchor}"`);
    }
  }

  const degrees = childFacing.match(DEGREE_RE) || [];
  const cms = childFacing.match(CM_RE) || [];
  const mults = childFacing.match(MULT_RE) || [];
  const parts = [];
  if (degrees.length) parts.push(`degrees ${[...new Set(degrees)].join(", ")}`);
  if (cms.length) parts.push(`cm ${[...new Set(cms)].join(", ")}`);
  if (mults.length) parts.push(`multiply ${[...new Set(mults)].join(", ")}`);
  if (parts.length) {
    notationNotes.push(`${pageId}: ${parts.join("; ")} (Bidi/browser review at runtime)`);
  }

  if (RAW_MARKDOWN_RE.test(childFacing)) {
    markdownNotes.push(`${pageId}: possible raw ** markdown`);
  }
  if (HIGH_RISK_RE.test(childFacing)) {
    markdownNotes.push(`${pageId}: code fence or table-like structure`);
  }
}

if (errors.length) {
  console.error(
    "G3 Geometry content verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}

console.log(`G3 Geometry content verification PASSED: ${GEOMETRY_G3_PAGE_ORDER.length} pages.`);
console.log("- 7 sections each");
console.log("- draft metadata + geometry:g3:{pageId} ids");
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
if (markdownNotes.length) {
  console.log("\nMarkdown / structure review notes:");
  for (const note of markdownNotes) {
    console.log(`  - ${note}`);
  }
}
