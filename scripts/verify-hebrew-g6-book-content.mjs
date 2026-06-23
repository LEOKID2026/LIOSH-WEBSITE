/**
 * Verify Grade 6 Hebrew / עברית learning book draft content (documentation only).
 * Run: node scripts/verify-hebrew-g6-book-content.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  parseLearningPageMarkdown,
  assertMathG1PageSections,
} from "../lib/learning-book/parse-learning-page-markdown.js";
import {
  HEBREW_G6_PAGE_ORDER,
  HEBREW_G6_ALIGNMENT_ANCHORS,
  HEBREW_G6_PAGE_META,
  HEBREW_G6_RICH_BAND_PAGE_IDS,
} from "./lib/hebrew-g6-draft-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DRAFTS_DIR = path.join(ROOT, "docs/learning-book/hebrew/g6/drafts");
const SPINE_PATH = path.join(ROOT, "data/curriculum-spine/v1/skills.json");

function stripNiqqud(s) {
  return String(s ?? "").replace(/[\u0591-\u05C7]/g, "");
}

const FAKE_PRACTICE_RE =
  /forceKind|fromBook=|hebrew-master\?|resolveHebrew|getHebrew.*Practice|learning\/book\/hebrew/i;
const RAW_MARKDOWN_RE = /\*\*[^*]+\*\*/;
const HIGH_RISK_RE = /```|^\s*\|.*\|.*\|/m;
const INTERNAL_KEY_RE =
  /hebrew:(g\d|rich)|skill_id|patternFamily|minGrade|maxGrade|word_level_early|binary_fact_early|gender_number_early|word_context_early|social_reply_early/i;

function readMetadataField(raw, field) {
  const re = new RegExp(`\\|\\s*\\*\\*${field}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`, "i");
  const m = raw.match(re);
  return m ? m[1].trim() : "";
}

function sectionBody(page, num) {
  const s = page.sections.find((x) => x.number === num);
  return s ? s.body : "";
}

function spineG6HebrewSkills() {
  const spineRaw = JSON.parse(fs.readFileSync(SPINE_PATH, "utf8"));
  const allSkills = spineRaw.skills ?? spineRaw;
  return allSkills.filter((s) => s.subject === "hebrew" && s.minGrade <= 6 && s.maxGrade >= 6);
}

const errors = [];
const markdownNotes = [];

const spineSkills = spineG6HebrewSkills();
const spineSkillIds = new Set(spineSkills.map((s) => s.skill_id));
const manifestSkillIds = new Set(
  HEBREW_G6_PAGE_ORDER.map((id) => HEBREW_G6_PAGE_META[id]?.skillId).filter(Boolean)
);

if (HEBREW_G6_PAGE_ORDER.length !== spineSkills.length) {
  errors.push(
    `Page count ${HEBREW_G6_PAGE_ORDER.length} != spine G6 Hebrew count ${spineSkills.length}`
  );
}

for (const skillId of spineSkillIds) {
  if (!manifestSkillIds.has(skillId)) {
    errors.push(`Spine skill missing from manifest: ${skillId}`);
  }
}
for (const skillId of manifestSkillIds) {
  if (!spineSkillIds.has(skillId)) {
    errors.push(`Manifest skill not in G6 spine: ${skillId}`);
  }
}

for (const pageId of HEBREW_G6_PAGE_ORDER) {
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
  if (readMetadataField(raw, "title_hebrew").includes("[DRAFT")) {
    errors.push(`${pageId}: title_hebrew must not include DRAFT marker`);
  }
  if (readMetadataField(raw, "grade") !== "g6") {
    errors.push(`${pageId}: grade must be g6`);
  }
  if (readMetadataField(raw, "age_band") !== "grades_5_6") {
    errors.push(`${pageId}: age_band must be grades_5_6`);
  }
  if (readMetadataField(raw, "subject") !== "hebrew") {
    errors.push(`${pageId}: subject must be hebrew`);
  }

  if (HEBREW_G6_RICH_BAND_PAGE_IDS.has(pageId) && !raw.includes("G6 depth")) {
    errors.push(`${pageId}: rich band page missing G6 depth metadata note`);
  }

  const learningPageId = readMetadataField(raw, "learning_page_id").replace(/^`|`$/g, "");
  const expectedId = `hebrew:g6:${pageId}`;
  if (learningPageId !== expectedId) {
    errors.push(
      `${pageId}: learning_page_id must be ${expectedId} (found: ${learningPageId || "missing"})`
    );
  }

  const meta = HEBREW_G6_PAGE_META[pageId];
  const skillId = readMetadataField(raw, "skill_id").replace(/^`|`$/g, "");
  if (meta && skillId !== meta.skillId) {
    errors.push(`${pageId}: skill_id must be ${meta.skillId}`);
  }

  const childFacing = page.sections.map((s) => s.body).join("\n");
  if (/\bhebrew\b/i.test(childFacing)) {
    errors.push(`${pageId}: child-facing body contains English hebrew`);
  }
  if (/\[DRAFT/i.test(childFacing)) {
    errors.push(`${pageId}: [DRAFT] marker in child-facing section body`);
  }
  if (FAKE_PRACTICE_RE.test(childFacing)) {
    errors.push(`${pageId}: Section body contains fake practice routing`);
  }
  if (INTERNAL_KEY_RE.test(childFacing)) {
    errors.push(`${pageId}: child-facing body contains internal key pattern`);
  }

  const s5 = sectionBody(page, 5);
  const s6 = sectionBody(page, 6);
  const s7 = sectionBody(page, 7);
  if (FAKE_PRACTICE_RE.test(s7)) {
    errors.push(`${pageId}: Section 7 contains fake practice routing`);
  }

  const anchors = HEBREW_G6_ALIGNMENT_ANCHORS[pageId] || [];
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
    markdownNotes.push(`${pageId}: code fence or table-like structure in child-facing body`);
  }
}

if (errors.length) {
  console.error(
    "G6 Hebrew content verification FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n")
  );
  process.exit(1);
}

console.log(`G6 Hebrew content verification PASSED: ${HEBREW_G6_PAGE_ORDER.length} pages.`);
console.log("- 7 sections each");
console.log("- draft metadata + hebrew:g6:{pageId} ids");
console.log("- spine G6 skill count matches manifest");
console.log(`- ${HEBREW_G6_RICH_BAND_PAGE_IDS.size} rich 5–6 band pages with G6 depth metadata`);
console.log("- no internal keys / English hebrew in child-facing bodies");
console.log("- Section 5/6 alignment anchors present");
console.log("- no fake practice routing in §7");
if (markdownNotes.length) {
  console.log("\nMarkdown / structure review notes:");
  for (const note of markdownNotes) {
    console.log(`  - ${note}`);
  }
} else {
  console.log("\nMarkdown / structure review notes: none.");
}
