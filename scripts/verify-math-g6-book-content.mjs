/**
 * Verify Grade 6 Math learning book draft content (documentation only).
 * Run: node scripts/verify-math-g6-book-content.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  MATH_G6_PAGE_ORDER,
  MATH_G6_ALIGNMENT_ANCHORS,
} from "./lib/math-g6-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/math/g6/drafts");

const THOUSANDS_RE = /\d{1,3}(?:,\d{3})+/g;
const RATIO_SCALE_RE = /\d+:\d+(?:,\d+)*/g;
const TIME_RE = /\d+:\d{2}(?!\d)/g;
const PERCENT_RE = /\d+(?:\.\d+)?%/g;
const FRACTION_RE = /\d+\/\d+/g;
const FAKE_PRACTICE_RE =
  /forceKind|fromBook=|math-master\?|resolveMathG6|getMathG6Practice/i;
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

const errors = [];
const bidiByCategory = {
  groupedNumbers: [],
  ratioScale: [],
  time: [],
  percent: [],
  fraction: [],
};
const mdNotes = [];

function uniqueMatches(re, text) {
  const m = text.match(re);
  return m ? [...new Set(m)] : [];
}

function pushBidi(category, pageId, tokens) {
  if (tokens.length) {
    bidiByCategory[category].push(`${pageId}: ${tokens.join(", ")}`);
  }
}

for (const pageId of MATH_G6_PAGE_ORDER) {
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
  if (readMetadataField(raw, "grade") !== "g6") {
    errors.push(`${pageId}: grade must be g6`);
  }
  if (readMetadataField(raw, "age_band") !== "grades_5_6") {
    errors.push(`${pageId}: age_band must be grades_5_6`);
  }

  const learningPageId = readMetadataField(raw, "learning_page_id").replace(/^`|`$/g, "");
  const expectedId = `math:g6:${pageId}`;
  if (learningPageId !== expectedId) {
    errors.push(`${pageId}: learning_page_id must be ${expectedId} (found: ${learningPageId || "missing"})`);
  }

  const childFacing = page.sections.map((s) => s.body).join("\n");
  if (childFacing.includes("מתמטיקה")) {
    errors.push(`${pageId}: child-facing body contains מתמטיקה`);
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

  const anchors = MATH_G6_ALIGNMENT_ANCHORS[pageId] || [];
  for (const anchor of anchors) {
    if (!s5.includes(anchor)) {
      errors.push(`${pageId}: §5 missing alignment anchor "${anchor}"`);
    }
    if (!s6.includes(anchor)) {
      errors.push(`${pageId}: §6 missing alignment anchor "${anchor}"`);
    }
  }

  pushBidi("groupedNumbers", pageId, uniqueMatches(THOUSANDS_RE, childFacing));
  pushBidi("ratioScale", pageId, uniqueMatches(RATIO_SCALE_RE, childFacing));
  pushBidi("time", pageId, uniqueMatches(TIME_RE, childFacing));
  pushBidi("percent", pageId, uniqueMatches(PERCENT_RE, childFacing));
  pushBidi("fraction", pageId, uniqueMatches(FRACTION_RE, childFacing));

  if (RAW_MD_RE.test(childFacing)) {
    mdNotes.push(`${pageId}: possible raw markdown structure (code fence or table) in body`);
  }
}

if (errors.length) {
  console.error("G6 content verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log(`G6 content verification PASSED: ${MATH_G6_PAGE_ORDER.length} pages.`);
console.log("- 7 sections each");
console.log("- draft metadata + math:g6:{pageId} ids");
console.log("- no מתמטיקה in body");
console.log("- Section 5/6 alignment anchors present");
console.log("- no fake practice routing in §7");

const bidiLabels = {
  groupedNumbers:
    "Grouped numbers (e.g. 200,000, 1,000, 10,000 — verify LTR isolation in browser)",
  ratioScale: "Ratio / scale tokens (e.g. 3:2, 1:50,000 — verify colon + digits in browser)",
  time: "Time tokens (e.g. 2:25, 1:40 — verify colon rendering in browser)",
  percent: "Percentage tokens (e.g. 40%, 15% — verify % placement in browser)",
  fraction: "Fraction tokens (e.g. 2/3, 1/4 — verify slash rendering in browser)",
};

let anyBidi = false;
for (const [key, label] of Object.entries(bidiLabels)) {
  const notes = bidiByCategory[key];
  if (notes.length) {
    anyBidi = true;
    console.log(`\nBidi review — ${label}:`);
    for (const note of notes) {
      console.log(`  - ${note}`);
    }
  }
}
if (!anyBidi) {
  console.log("\nBidi review notes: no high-risk tokens detected in child-facing bodies.");
}
if (mdNotes.length) {
  console.log("\nMarkdown structure notes:");
  for (const note of mdNotes) {
    console.log(`  - ${note}`);
  }
} else {
  console.log("\nMarkdown structure notes: no code fences or ASCII tables in section bodies.");
}
