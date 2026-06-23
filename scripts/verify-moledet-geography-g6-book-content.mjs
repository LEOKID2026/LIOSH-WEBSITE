/**
 * Verify Grade 6 Moledet / Geography learning book draft content (documentation only).
 * Run: node scripts/verify-moledet-geography-g6-book-content.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  MOLEDET_GEOGRAPHY_G6_PAGE_ORDER,
  MOLEDET_GEOGRAPHY_G6_ALIGNMENT_ANCHORS,
  MOLEDET_GEOGRAPHY_G6_PAGE_META,
} from "./lib/moledet-geography-g6-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = path.join(__dirname, "../docs/learning-book/moledet-geography/g6/drafts");

const FAKE_PRACTICE_RE =
  /forceKind|fromBook=|moledet-geography-master\?|resolveMoledetGeography|getMoledetGeography/i;
const FEAR_RE = /אסון נורא|מפחיד מאוד|סכנה מיידית|panic/i;
const SCIENCE_MECHANISM_RE =
  /אידוי|מolecule|מולקול|לחץ אוויר|מעגל מים/i;
const OFFICE_HOLDER_RE = /ראש הממשלה|נשיא המדינה|שר ה|ח"כ /;
const POLITICAL_RE = /מפלג|ימין|שמאל|קואליציה|מחאה/i;
const CURRENT_EVENTS_RE = /202[0-9]|אירוע נוכחי|מלחמת|בחירות האחרונות/i;
const STEREOTYPE_RE = /כל ה.+ תמיד|תמיד .+ כי הם/i;

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

for (const pageId of MOLEDET_GEOGRAPHY_G6_PAGE_ORDER) {
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
  if (readMetadataField(raw, "grade") !== "g6") {
    errors.push(`${pageId}: grade must be g6`);
  }
  if (readMetadataField(raw, "age_band") !== "grades_5_6") {
    errors.push(`${pageId}: age_band must be grades_5_6`);
  }
  if (readMetadataField(raw, "subject") !== "geography") {
    errors.push(`${pageId}: subject must be geography`);
  }

  const learningPageId = readMetadataField(raw, "learning_page_id").replace(/^`|`$/g, "");
  const expectedId = `geography:g6:${pageId}`;
  if (learningPageId !== expectedId) {
    errors.push(
      `${pageId}: learning_page_id must be ${expectedId} (found: ${learningPageId || "missing"})`
    );
  }

  const meta = MOLEDET_GEOGRAPHY_G6_PAGE_META[pageId];
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
  if (/\[VERIFY\]/i.test(childFacing)) {
    errors.push(`${pageId}: [VERIFY] marker in child-facing section body`);
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
    errors.push(`${pageId}: references office-holder titles in body`);
  }
  if (POLITICAL_RE.test(childFacing)) {
    errors.push(`${pageId}: political framing in body`);
  }
  if (CURRENT_EVENTS_RE.test(childFacing)) {
    errors.push(`${pageId}: current-events reference in body`);
  }
  if (STEREOTYPE_RE.test(childFacing)) {
    errors.push(`${pageId}: possible stereotyping language in body`);
  }

  const s5 = sectionBody(page, 5);
  const s6 = sectionBody(page, 6);
  if (FAKE_PRACTICE_RE.test(sectionBody(page, 7))) {
    errors.push(`${pageId}: Section 7 contains fake practice routing`);
  }

  const anchors = MOLEDET_GEOGRAPHY_G6_ALIGNMENT_ANCHORS[pageId] || [];
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
    "G6 Moledet/Geography content verification FAILED:\n" +
      errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}

console.log(
  `G6 Moledet/Geography content verification PASSED: ${MOLEDET_GEOGRAPHY_G6_PAGE_ORDER.length} pages.`
);
console.log("- grades_5_6 age band; geography:g6:{pageId} ids");
console.log("- highest sensitivity: neutral diversity, democracy, values, institutions");
console.log("- no stereotypes, political framing, current events, or office-holders in body");
