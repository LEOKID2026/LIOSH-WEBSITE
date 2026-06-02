/**
 * Verify English Learning Book master scope mapping (documentation only).
 * Run: node scripts/verify-english-learning-book-master-scope.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  ENGLISH_SUBJECT_KEY,
  ENGLISH_MASTER_SCOPE,
} from "./lib/english-learning-book-master-scope-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SKILLS_PATH = path.join(ROOT, "data/curriculum-spine/v1/skills.json");

/** @type {string[]} */
const errors = [];

const spine = JSON.parse(fs.readFileSync(SKILLS_PATH, "utf8"));
const allSkills = spine.skills || [];
const englishSkills = allSkills.filter((s) => s.subject === ENGLISH_SUBJECT_KEY);
const englishById = new Map(englishSkills.map((s) => [s.skill_id, s]));

function gradeInScope(skill, gradeNum) {
  return skill.minGrade <= gradeNum && skill.maxGrade >= gradeNum;
}

if (englishSkills.length !== ENGLISH_MASTER_SCOPE.totalEnglishSkills) {
  errors.push(
    `Spine English count mismatch: spine=${englishSkills.length}, manifest=${ENGLISH_MASTER_SCOPE.totalEnglishSkills}`
  );
}

const manifestIds = new Set(ENGLISH_MASTER_SCOPE.allSkillIds);
for (const skill of englishSkills) {
  if (!manifestIds.has(skill.skill_id)) {
    errors.push(`Spine skill missing from manifest allSkillIds: ${skill.skill_id}`);
  }
}
for (const id of manifestIds) {
  if (!englishById.has(id)) {
    errors.push(`Manifest skill_id not in spine: ${id}`);
  }
  const skill = englishById.get(id);
  if (skill && skill.subject !== ENGLISH_SUBJECT_KEY) {
    errors.push(`Subject mixing: ${id} has subject=${skill.subject}`);
  }
}

/** @type {Set<string>} */
const accounted = new Set();

for (const [gradeKey, gradeDef] of Object.entries(ENGLISH_MASTER_SCOPE.grades)) {
  const gradeNum = Number(gradeKey.replace("g", ""));
  if (!Number.isFinite(gradeNum) || gradeNum < 1 || gradeNum > 6) {
    errors.push(`Invalid grade key in manifest: ${gradeKey}`);
    continue;
  }

  for (const skillId of gradeDef.included) {
    accounted.add(`${gradeKey}:${skillId}`);
    const skill = englishById.get(skillId);
    if (!skill) {
      errors.push(`${gradeKey}: included skill not in spine: ${skillId}`);
      continue;
    }
    if (skill.subject !== ENGLISH_SUBJECT_KEY) {
      errors.push(`${gradeKey}: included skill wrong subject: ${skillId}`);
    }
    if (!gradeInScope(skill, gradeNum)) {
      errors.push(
        `${gradeKey}: included skill fails grade filter (${skillId} spine G${skill.minGrade}-${skill.maxGrade})`
      );
    }
  }

  const teachableSet = new Set(gradeDef.teachable);
  const excludedSet = new Set(gradeDef.excluded.map((e) => e.skill_id));
  for (const skillId of gradeDef.included) {
    const inTeachable = teachableSet.has(skillId);
    const inExcluded = excludedSet.has(skillId);
    if (inTeachable === inExcluded) {
      errors.push(`${gradeKey}: skill must be exactly teachable OR excluded: ${skillId}`);
    }
  }

  for (const skillId of gradeDef.new) {
    if (!teachableSet.has(skillId)) {
      errors.push(`${gradeKey}: new skill not in teachable: ${skillId}`);
    }
    const skill = englishById.get(skillId);
    if (skill && skill.minGrade !== gradeNum) {
      errors.push(`${gradeKey}: new skill minGrade mismatch: ${skillId}`);
    }
  }

  for (const skillId of gradeDef.continuing) {
    if (!teachableSet.has(skillId)) {
      errors.push(`${gradeKey}: continuing skill not in teachable: ${skillId}`);
    }
    const skill = englishById.get(skillId);
    if (skill && skill.minGrade >= gradeNum) {
      errors.push(`${gradeKey}: continuing skill minGrade too high: ${skillId}`);
    }
  }

  const expectedPages = gradeDef.teachable.length;
  const manifestPages = ENGLISH_MASTER_SCOPE.proposedPageCounts[gradeKey];
  if (expectedPages !== manifestPages) {
    errors.push(
      `${gradeKey}: proposedPageCounts=${manifestPages} but teachable.length=${expectedPages}`
    );
  }
}

for (let g = 1; g <= 6; g++) {
  const gradeKey = `g${g}`;
  const inScope = englishSkills.filter((s) => gradeInScope(s, g));
  for (const skill of inScope) {
    const key = `${gradeKey}:${skill.skill_id}`;
    if (!accounted.has(key)) {
      errors.push(`${gradeKey}: spine skill not accounted in manifest included: ${skill.skill_id}`);
    }
  }
}

if (errors.length) {
  console.error("English master scope verification FAILED:\n");
  for (const e of errors) console.error("  -", e);
  process.exit(1);
}

console.log("English master scope verification OK");
console.log(`  subject key: ${ENGLISH_SUBJECT_KEY}`);
console.log(`  total English skills: ${englishSkills.length}`);
console.log("  proposed page counts:", ENGLISH_MASTER_SCOPE.proposedPageCounts);
