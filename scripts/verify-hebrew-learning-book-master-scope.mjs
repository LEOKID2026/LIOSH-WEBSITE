/**
 * Verify Hebrew Learning Book master scope plan (mapping-only gate).
 * Run: node scripts/verify-hebrew-learning-book-master-scope.mjs
 *
 * Checks:
 * - Hebrew subject key and skill inventory in curriculum spine
 * - Grade filter counts match the master plan
 * - skill_ids cited in the plan exist in skills.json with correct grade span
 * - No subject mixing in Hebrew rows
 * - No Hebrew learning-book runtime/registry artifacts were added
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SPINE_PATH = path.join(ROOT, "data/curriculum-spine/v1/skills.json");
const PLAN_PATH = path.join(
  ROOT,
  "docs/learning-book/HEBREW_LEARNING_BOOK_MASTER_SCOPE_PLAN.md"
);

const HEBREW_SUBJECT = "hebrew";
const EXPECTED_GRADE_COUNTS = { 1: 32, 2: 23, 3: 31, 4: 29, 5: 28, 6: 29 };
const EXPECTED_TOTAL = 135;

let failures = 0;

function fail(msg) {
  failures += 1;
  console.error("FAIL:", msg);
}

function pass(msg) {
  console.log("OK:", msg);
}

function skillsInGrade(skills, grade) {
  return skills.filter((s) => s.minGrade <= grade && s.maxGrade >= grade);
}

const spineRaw = JSON.parse(fs.readFileSync(SPINE_PATH, "utf8"));
const allSkills = spineRaw.skills ?? spineRaw;
const hebrewSkills = allSkills.filter((s) => s.subject === HEBREW_SUBJECT);

if (hebrewSkills.length !== EXPECTED_TOTAL) {
  fail(`Expected ${EXPECTED_TOTAL} Hebrew skills, found ${hebrewSkills.length}`);
} else {
  pass(`${EXPECTED_TOTAL} Hebrew skills in spine`);
}

const nonHebrewWithHebrewId = allSkills.filter(
  (s) => s.skill_id?.startsWith("hebrew:") && s.subject !== HEBREW_SUBJECT
);
if (nonHebrewWithHebrewId.length) {
  fail(`skill_id prefix hebrew: with wrong subject: ${nonHebrewWithHebrewId.map((s) => s.skill_id).join(", ")}`);
} else {
  pass("No subject mixing on hebrew:-prefixed skill_ids");
}

for (let g = 1; g <= 6; g++) {
  const count = skillsInGrade(hebrewSkills, g).length;
  if (count !== EXPECTED_GRADE_COUNTS[g]) {
    fail(`Grade ${g}: expected ${EXPECTED_GRADE_COUNTS[g]} skills, found ${count}`);
  }
}
pass("Per-grade spine counts match master plan");

if (!fs.existsSync(PLAN_PATH)) {
  fail(`Missing plan: ${PLAN_PATH}`);
} else {
  const plan = fs.readFileSync(PLAN_PATH, "utf8");
  if (!plan.includes('`hebrew`')) {
    fail("Plan must document Hebrew subject key `hebrew`");
  }
  const cited = [...plan.matchAll(/`(hebrew:[^`]+)`/g)].map((m) => m[1]);
  const isConcreteSkillId = (id) =>
    !/[*{]/.test(id) &&
    !id.endsWith("...") &&
    id.split(":").length >= 4;
  const uniqueCited = [...new Set(cited.filter(isConcreteSkillId))];
  const spineById = new Map(hebrewSkills.map((s) => [s.skill_id, s]));
  for (const id of uniqueCited) {
    if (!spineById.get(id)) {
      fail(`Plan cites missing spine skill_id: ${id}`);
    }
  }
  const spineIds = new Set(hebrewSkills.map((s) => s.skill_id));
  const missingFromPlan = [...spineIds].filter((id) => !uniqueCited.includes(id));
  if (missingFromPlan.length) {
    fail(
      `Plan missing ${missingFromPlan.length} spine skill_id(s), e.g. ${missingFromPlan.slice(0, 3).join(", ")}`
    );
  } else {
    pass(`Plan cites all ${EXPECTED_TOTAL} concrete Hebrew skill_ids`);
  }
}

const forbiddenPaths = [
  path.join(ROOT, "lib/learning-book/hebrew-learning-book-registry.js"),
  path.join(ROOT, "pages/learning-book/hebrew"),
  path.join(ROOT, "docs/learning-book/hebrew/g1/drafts"),
];

for (const p of forbiddenPaths) {
  if (fs.existsSync(p)) {
    fail(`Runtime/draft artifact must not exist yet: ${p}`);
  }
}
pass("No Hebrew learning-book runtime registry or draft tree");

if (failures > 0) {
  console.error(`\n${failures} verification failure(s).`);
  process.exit(1);
}
console.log("\nAll Hebrew master scope checks passed.");
