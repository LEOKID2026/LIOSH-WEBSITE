/**
 * Verify Grade 3 Math learning book draft content (documentation only).
 * Run: node scripts/verify-math-g3-book-content.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import { MATH_G3_PAGE_ORDER } from "../lib/learning-book/math-g3-registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/math/g3/drafts");

/** Section 5/6 alignment anchors per page — key numbers from plan */
const ALIGNMENT_ANCHORS = {
  ns_place_hundreds: ["472"],
  ns_neighbors: ["350"],
  ns_complement10: ["7", "10"],
  ns_complement100: ["63", "100"],
  ns_even_odd: ["48"],
  cmp: ["456", "465"],
  sequence: ["5", "10", "15"],
  add_two: ["248", "156"],
  sub_two: ["503", "287"],
  add_three: ["125", "40", "35"],
  mul: ["7", "8"],
  mul_tens: ["4", "30"],
  mul_hundreds: ["5", "200"],
  div: ["84", "4"],
  div_with_remainder: ["23", "5"],
  divisibility: ["35"],
  eq_add: ["45", "72"],
  eq_sub: ["18", "42"],
  dec_add: ["2.3", "1.4"],
  dec_sub: ["5.7", "2.2"],
  order_add_mul: ["6", "4", "2"],
  order_mul_sub: ["30", "3", "4"],
  order_parentheses: ["8", "2", "3"],
  wp_comparison_more: ["52", "37"],
  wp_leftover: ["47", "6"],
  wp_time_sum: ["35", "25"],
};

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

for (const pageId of MATH_G3_PAGE_ORDER) {
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
  if (readMetadataField(raw, "grade") !== "g3") {
    errors.push(`${pageId}: grade must be g3`);
  }
  if (readMetadataField(raw, "age_band") !== "grades_3_4") {
    errors.push(`${pageId}: age_band must be grades_3_4`);
  }

  const childFacing = page.sections.map((s) => s.body).join("\n");
  if (childFacing.includes("מתמטיקה")) {
    errors.push(`${pageId}: child-facing body contains מתמטיקה`);
  }
  if (/\[DRAFT/i.test(childFacing)) {
    errors.push(`${pageId}: [DRAFT] marker in child-facing section body`);
  }

  const s5 = sectionBody(page, 5);
  const s6 = sectionBody(page, 6);
  const anchors = ALIGNMENT_ANCHORS[pageId] || [];
  for (const anchor of anchors) {
    if (!s5.includes(anchor)) {
      errors.push(`${pageId}: §5 missing alignment anchor "${anchor}"`);
    }
    if (!s6.includes(anchor)) {
      errors.push(`${pageId}: §6 missing alignment anchor "${anchor}"`);
    }
  }
}

if (errors.length) {
  console.error("G3 content verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log(`G3 content verification PASSED: ${MATH_G3_PAGE_ORDER.length} pages.`);
console.log("- 7 sections each");
console.log("- draft metadata");
console.log("- no מתמטיקה in body");
console.log("- Section 5/6 alignment anchors present");
