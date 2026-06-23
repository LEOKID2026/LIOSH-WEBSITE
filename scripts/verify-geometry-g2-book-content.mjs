/**
 * Verify Grade 2 Geometry learning book draft content (documentation only).
 * Run: node scripts/verify-geometry-g2-book-content.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  GEOMETRY_G2_PAGE_ORDER,
  GEOMETRY_G2_ALIGNMENT_ANCHORS,
} from "./lib/geometry-g2-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/geometry/g2/drafts");

const FAKE_PRACTICE_RE =
  /forceKind|fromBook=|geometry-master\?|resolveGeometryG2|getGeometryG2Practice/i;
const RAW_MARKDOWN_RE = /\*\*[^*]+\*\*/;
const HIGH_RISK_RE = /```|^\s*\|.*\|.*\|/m;

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

for (const pageId of GEOMETRY_G2_PAGE_ORDER) {
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
  if (readMetadataField(raw, "grade") !== "g2") {
    errors.push(`${pageId}: grade must be g2`);
  }
  if (readMetadataField(raw, "age_band") !== "grades_1_2") {
    errors.push(`${pageId}: age_band must be grades_1_2`);
  }

  const learningPageId = readMetadataField(raw, "learning_page_id").replace(/^`|`$/g, "");
  const expectedId = `geometry:g2:${pageId}`;
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

  const anchors = GEOMETRY_G2_ALIGNMENT_ANCHORS[pageId] || [];
  for (const anchor of anchors) {
    if (!s5.includes(anchor)) {
      errors.push(`${pageId}: Â§5 missing alignment anchor "${anchor}"`);
    }
    if (!s6.includes(anchor)) {
      errors.push(`${pageId}: Â§6 missing alignment anchor "${anchor}"`);
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
    "G2 Geometry content verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}

console.log(`G2 Geometry content verification PASSED: ${GEOMETRY_G2_PAGE_ORDER.length} pages.`);
console.log("- 7 sections each");
console.log("- draft metadata + geometry:g2:{pageId} ids");
console.log("- ×’××•×ž×˜×¨×™×” naming; no ×”× ×“×¡×” / English geometry in body");
console.log("- Section 5/6 alignment anchors present");
console.log("- no fake practice routing in Â§7");
if (markdownNotes.length) {
  console.log("\nMarkdown / structure review notes:");
  for (const note of markdownNotes) {
    console.log(`  - ${note}`);
  }
} else {
  console.log("\nMarkdown / structure review notes: none.");
}
