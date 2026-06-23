/**
 * Verify Grade 1 Hebrew learning book draft content (documentation only).
 * Run: node scripts/verify-hebrew-g1-book-content.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  HEBREW_G1_PAGE_ORDER,
  HEBREW_G1_ALIGNMENT_ANCHORS,
  HEBREW_G1_PAGE_META,
} from "./lib/hebrew-g1-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DRAFTS_DIR = path.join(ROOT, "docs/learning-book/hebrew/g1/drafts");
const SPINE_PATH = path.join(ROOT, "data/curriculum-spine/v1/skills.json");

const EXPECTED_G1_COUNT = 32;
/** Strip niqqud/cantillation marks for content comparison (MD files store unvocalized text). */
function stripNiqqud(s) {
  return String(s ?? "").replace(/[\u0591-\u05C7]/g, "");
}

const FAKE_PRACTICE_RE =
  /forceKind|fromBook=|hebrew-master\?|resolveHebrew|getHebrewG1Practice|practice_mapping/i;
const RAW_MARKDOWN_RE = /\*\*[^*]+\*\*/;
const HIGH_RISK_RE = /```|^\s*\|.*\|.*\|/m;
const INTERNAL_KEY_RE =
  /hebrew:g|hebrew:rich|skill_id|learning_page_id|approval_status|:rich:|patternFamily|binary_fact_early/i;

const REQUIRED_SECTION_TITLES = [
  "מה לומדים?",
  "הסבר",
  "דוגמה",
  "בואו נפתור",
  "נסו בעצמכם",
  "בואו נבדוק יחד",
  "בואו נתרגל!",
];

function readMetadataField(raw, field) {
  const re = new RegExp(`\\|\\s*\\*\\*${field}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`, "i");
  const m = raw.match(re);
  return m ? m[1].trim() : "";
}

function sectionBody(page, num) {
  const s = page.sections.find((x) => x.number === num);
  return s ? s.body : "";
}

const spineRaw = JSON.parse(fs.readFileSync(SPINE_PATH, "utf8"));
const allSkills = spineRaw.skills ?? spineRaw;
const g1Spine = allSkills.filter(
  (s) => s.subject === "hebrew" && s.minGrade <= 1 && s.maxGrade >= 1
);

const errors = [];
const markdownNotes = [];

if (g1Spine.length !== EXPECTED_G1_COUNT) {
  errors.push(
    `Spine G1 Hebrew count ${g1Spine.length} !== expected ${EXPECTED_G1_COUNT}`
  );
}

if (HEBREW_G1_PAGE_ORDER.length !== EXPECTED_G1_COUNT) {
  errors.push(
    `Manifest page count ${HEBREW_G1_PAGE_ORDER.length} !== expected ${EXPECTED_G1_COUNT}`
  );
}

const spineIds = new Set(g1Spine.map((s) => s.skill_id));
const manifestSkillIds = HEBREW_G1_PAGE_ORDER.map((p) => HEBREW_G1_PAGE_META[p].skillId);
for (const id of manifestSkillIds) {
  if (!spineIds.has(id)) {
    errors.push(`Manifest skill_id not in G1 spine: ${id}`);
  }
}
for (const row of g1Spine) {
  if (!manifestSkillIds.includes(row.skill_id)) {
    errors.push(`Spine G1 skill missing from manifest: ${row.skill_id}`);
  }
}

for (const pageId of HEBREW_G1_PAGE_ORDER) {
  const filePath = path.join(DRAFTS_DIR, `${pageId}.md`);
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing: ${pageId}.md`);
    continue;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const page = parseLearningPageMarkdown(raw, pageId);
  const meta = HEBREW_G1_PAGE_META[pageId];

  try {
    assertMathG1PageSections(page);
  } catch (e) {
    errors.push(e.message);
  }

  for (let i = 0; i < REQUIRED_SECTION_TITLES.length; i++) {
    const sec = page.sections.find((s) => s.number === i + 1);
    if (!sec || !sec.title.includes(REQUIRED_SECTION_TITLES[i].replace("!", ""))) {
      errors.push(
        `${pageId}: section ${i + 1} title must match "${REQUIRED_SECTION_TITLES[i]}"`
      );
    }
  }

  if (readMetadataField(raw, "approval_status") !== "approved") {
    errors.push(`${pageId}: approval_status must be approved`);
  }
  if (readMetadataField(raw, "title_hebrew").includes("[DRAFT")) {
    errors.push(`${pageId}: title_hebrew must not include DRAFT marker`);
  }
  if (readMetadataField(raw, "grade") !== "g1") {
    errors.push(`${pageId}: grade must be g1`);
  }
  if (readMetadataField(raw, "age_band") !== "grades_1_2") {
    errors.push(`${pageId}: age_band must be grades_1_2`);
  }
  if (readMetadataField(raw, "subject") !== "hebrew") {
    errors.push(`${pageId}: subject must be hebrew`);
  }

  const learningPageId = readMetadataField(raw, "learning_page_id").replace(/^`|`$/g, "");
  if (learningPageId !== meta.learningPageId) {
    errors.push(
      `${pageId}: learning_page_id must be ${meta.learningPageId} (found: ${learningPageId || "missing"})`
    );
  }

  const skillId = readMetadataField(raw, "skill_id").replace(/^`|`$/g, "");
  if (skillId !== meta.skillId) {
    errors.push(`${pageId}: skill_id must be ${meta.skillId}`);
  }

  const childFacing = page.sections.map((s) => s.body).join("\n");
  if (/\[DRAFT/i.test(childFacing)) {
    errors.push(`${pageId}: [DRAFT] marker in child-facing section body`);
  }
  if (FAKE_PRACTICE_RE.test(childFacing)) {
    errors.push(`${pageId}: fake practice routing in section body`);
  }
  if (INTERNAL_KEY_RE.test(childFacing)) {
    errors.push(`${pageId}: internal key leak in child-facing body`);
  }

  const s5 = sectionBody(page, 5);
  const s6 = sectionBody(page, 6);
  const s7 = sectionBody(page, 7);
  if (FAKE_PRACTICE_RE.test(s7)) {
    errors.push(`${pageId}: Section 7 contains fake practice routing`);
  }
  if (!/בתרגול תמצאו/.test(s7)) {
    errors.push(`${pageId}: Section 7 must mention בתרגול תמצאו`);
  }

  const anchors = HEBREW_G1_ALIGNMENT_ANCHORS[pageId] || [];
  const s5Plain = stripNiqqud(s5);
  const s6Plain = stripNiqqud(s6);
  for (const anchor of anchors) {
    const anchorPlain = stripNiqqud(anchor);
    if (!s5Plain.includes(anchorPlain)) {
      errors.push(`${pageId}: §5 missing alignment anchor "${anchor}"`);
    }
    if (!s6Plain.includes(anchorPlain)) {
      errors.push(`${pageId}: §6 missing alignment anchor "${anchor}"`);
    }
  }

  if (RAW_MARKDOWN_RE.test(childFacing)) {
    markdownNotes.push(`${pageId}: possible raw ** markdown in child-facing body`);
  }
  if (HIGH_RISK_RE.test(childFacing)) {
    markdownNotes.push(`${pageId}: code fence or table in child-facing body`);
  }
}

const extra = fs
  .readdirSync(DRAFTS_DIR)
  .filter((f) => f.endsWith(".md") && f !== "README.md");
if (extra.length !== EXPECTED_G1_COUNT) {
  errors.push(`Draft folder has ${extra.length} .md files (expected ${EXPECTED_G1_COUNT} + README)`);
}

if (errors.length) {
  console.error(
    "G1 Hebrew content verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}

console.log(`G1 Hebrew content verification PASSED: ${HEBREW_G1_PAGE_ORDER.length} pages.`);
console.log(`- Reconciled with skills.json: ${g1Spine.length} G1 Hebrew spine rows`);
console.log("- 7 sections each (מה לומדים? … בואו נתרגל!)");
console.log("- draft metadata + hebrew:g1:* learning_page_id");
console.log("- no internal keys / [DRAFT] in bodies; §5/§6 anchors");
if (markdownNotes.length) {
  console.log("\nMarkdown / Bidi review notes:");
  for (const note of markdownNotes) console.log(`  - ${note}`);
} else {
  console.log("\nMarkdown / Bidi review notes: none.");
}
