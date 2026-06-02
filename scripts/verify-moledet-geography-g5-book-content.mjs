/**
 * Verify Grade 5 Moledet / Geography learning book draft content (documentation only).
 * Run: node scripts/verify-moledet-geography-g5-book-content.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  MOLEDET_GEOGRAPHY_G5_PAGE_ORDER,
  MOLEDET_GEOGRAPHY_G5_ALIGNMENT_ANCHORS,
  MOLEDET_GEOGRAPHY_G5_PAGE_META,
} from "./lib/moledet-geography-g5-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/moledet-geography/g5/drafts");

const FAKE_PRACTICE_RE =
  /forceKind|fromBook=|moledet-geography-master\?|resolveMoledetGeography|getMoledetGeography/i;
const FEAR_RE = /אסון נורא|מפחיד מאוד|סכנה מיידית|panic/i;
const SCIENCE_MECHANISM_RE =
  /אידוי|מolecule|מולקול|לחץ אוויר|מעגל מים/i;
const OFFICE_HOLDER_RE = /ראש הממשלה|נשיא המדינה|שר ה|ח"כ /;

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

for (const pageId of MOLEDET_GEOGRAPHY_G5_PAGE_ORDER) {
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
  if (readMetadataField(raw, "grade") !== "g5") {
    errors.push(`${pageId}: grade must be g5`);
  }
  if (readMetadataField(raw, "age_band") !== "grades_5_6") {
    errors.push(`${pageId}: age_band must be grades_5_6`);
  }
  if (readMetadataField(raw, "subject") !== "geography") {
    errors.push(`${pageId}: subject must be geography`);
  }

  const learningPageId = readMetadataField(raw, "learning_page_id").replace(/^`|`$/g, "");
  const expectedId = `geography:g5:${pageId}`;
  if (learningPageId !== expectedId) {
    errors.push(
      `${pageId}: learning_page_id must be ${expectedId} (found: ${learningPageId || "missing"})`
    );
  }

  const meta = MOLEDET_GEOGRAPHY_G5_PAGE_META[pageId];
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
    errors.push(`${pageId}: fake practice routing in body`);
  }
  if (FEAR_RE.test(childFacing)) {
    errors.push(`${pageId}: fear/alarm language in body`);
  }
  if (SCIENCE_MECHANISM_RE.test(childFacing)) {
    errors.push(`${pageId}: scientific mechanism detail (Science scope)`);
  }
  if (OFFICE_HOLDER_RE.test(childFacing)) {
    errors.push(`${pageId}: references current office-holder titles in body`);
  }

  const s5 = sectionBody(page, 5);
  const s6 = sectionBody(page, 6);
  if (FAKE_PRACTICE_RE.test(sectionBody(page, 7))) {
    errors.push(`${pageId}: Section 7 contains fake practice routing`);
  }

  const anchors = MOLEDET_GEOGRAPHY_G5_ALIGNMENT_ANCHORS[pageId] || [];
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
  console.error(
    "G5 Moledet/Geography content verification FAILED:\n" +
      errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}

console.log(
  `G5 Moledet/Geography content verification PASSED: ${MOLEDET_GEOGRAPHY_G5_PAGE_ORDER.length} pages.`
);
console.log("- grades_5_6 age band; geography:g5:{pageId} ids");
console.log("- hazards: awareness tone; no fear/alarm language");
console.log("- climate/resources: no Science mechanism detail");
console.log("- institutions: role-based; no current office-holder refs in body");
