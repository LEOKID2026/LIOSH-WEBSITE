/**
 * Verify Science Learning Book master scope plan (mapping-only gate).
 * Run: node scripts/verify-science-learning-book-master-scope.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  SCIENCE_SUBJECT_KEY,
  SCIENCE_MASTER_SCOPE,
} from "./lib/science-learning-book-master-scope-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SKILLS_PATH = path.join(ROOT, "data/curriculum-spine/v1/skills.json");
const PLAN_PATH = path.join(
  ROOT,
  "docs/learning-book/SCIENCE_LEARNING_BOOK_MASTER_SCOPE_PLAN.md"
);

/** @type {string[]} */
const errors = [];

const spine = JSON.parse(fs.readFileSync(SKILLS_PATH, "utf8"));
const allSkills = spine.skills || [];
const scienceSkills = allSkills.filter((s) => s.subject === SCIENCE_SUBJECT_KEY);
const scienceById = new Map(scienceSkills.map((s) => [s.skill_id, s]));

function gradeInScope(skill, gradeNum) {
  return skill.minGrade <= gradeNum && skill.maxGrade >= gradeNum;
}

if (scienceSkills.length !== SCIENCE_MASTER_SCOPE.totalScienceSkills) {
  errors.push(
    `Spine science count mismatch: spine=${scienceSkills.length}, manifest=${SCIENCE_MASTER_SCOPE.totalScienceSkills}`
  );
}

const manifestIds = new Set(SCIENCE_MASTER_SCOPE.allSkillIds);
for (const skill of scienceSkills) {
  if (!manifestIds.has(skill.skill_id)) {
    errors.push(`Spine skill missing from manifest allSkillIds: ${skill.skill_id}`);
  }
}
for (const id of manifestIds) {
  if (!scienceById.has(id)) {
    errors.push(`Manifest skill_id not in spine: ${id}`);
  }
  const skill = scienceById.get(id);
  if (skill && skill.subject !== SCIENCE_SUBJECT_KEY) {
    errors.push(`Subject mixing: ${id} has subject=${skill.subject}`);
  }
}

const nonScienceWithSciencePrefix = allSkills.filter(
  (s) => s.skill_id?.startsWith("science:") && s.subject !== SCIENCE_SUBJECT_KEY
);
if (nonScienceWithSciencePrefix.length) {
  errors.push(
    `science:-prefixed skill_id with wrong subject: ${nonScienceWithSciencePrefix.map((s) => s.skill_id).join(", ")}`
  );
}

/** @type {Set<string>} */
const accounted = new Set();

for (const [gradeKey, gradeDef] of Object.entries(SCIENCE_MASTER_SCOPE.grades)) {
  const gradeNum = Number(gradeKey.replace("g", ""));
  if (!Number.isFinite(gradeNum) || gradeNum < 1 || gradeNum > 6) {
    errors.push(`Invalid grade key in manifest: ${gradeKey}`);
    continue;
  }

  const expectedInScope = SCIENCE_MASTER_SCOPE.inScopeSkillCountsByGrade[gradeNum];
  const actualInScope = scienceSkills.filter((s) => gradeInScope(s, gradeNum)).length;
  if (expectedInScope !== actualInScope) {
    errors.push(
      `${gradeKey}: in-scope spine count expected ${expectedInScope}, found ${actualInScope}`
    );
  }

  for (const skillId of gradeDef.included) {
    const skill = scienceById.get(skillId);
    if (!skill) {
      errors.push(`${gradeKey}: included skill not in spine: ${skillId}`);
      continue;
    }
    if (skill.subject !== SCIENCE_SUBJECT_KEY) {
      errors.push(`${gradeKey}: included skill wrong subject: ${skillId}`);
    }
    if (!gradeInScope(skill, gradeNum)) {
      errors.push(
        `${gradeKey}: included skill fails grade filter (${skillId} spine G${skill.minGrade}-${skill.maxGrade})`
      );
    }
    accounted.add(`${gradeKey}:${skillId}`);
  }

  for (const skill of scienceSkills.filter((s) => gradeInScope(s, gradeNum))) {
    const key = `${gradeKey}:${skill.skill_id}`;
    if (!accounted.has(key)) {
      errors.push(
        `${gradeKey}: spine skill not accounted in manifest included: ${skill.skill_id}`
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
    const skill = scienceById.get(skillId);
    if (skill && skill.minGrade !== gradeNum) {
      errors.push(`${gradeKey}: new skill minGrade mismatch: ${skillId}`);
    }
  }

  for (const skillId of gradeDef.continuing) {
    if (!teachableSet.has(skillId)) {
      errors.push(`${gradeKey}: continuing skill not in teachable: ${skillId}`);
    }
    const skill = scienceById.get(skillId);
    if (skill && skill.minGrade >= gradeNum) {
      errors.push(`${gradeKey}: continuing skill minGrade too high: ${skillId}`);
    }
  }

  const expectedPages = gradeDef.teachable.length;
  const manifestPages = SCIENCE_MASTER_SCOPE.proposedPageCounts[gradeKey];
  if (expectedPages !== manifestPages) {
    errors.push(
      `${gradeKey}: proposedPageCounts=${manifestPages} but teachable.length=${expectedPages}`
    );
  }
}

if (!fs.existsSync(PLAN_PATH)) {
  errors.push(`Missing plan document: ${PLAN_PATH}`);
} else {
  const plan = fs.readFileSync(PLAN_PATH, "utf8");
  if (!plan.includes("`science`")) {
    errors.push("Plan must document Science subject key `science`");
  }
  for (const id of SCIENCE_MASTER_SCOPE.allSkillIds) {
    if (!plan.includes(id)) {
      errors.push(`Plan missing skill_id reference: ${id}`);
    }
  }
}

const forbiddenPaths = [
  path.join(ROOT, "lib/learning-book/science-learning-book-registry.js"),
];

for (const p of forbiddenPaths) {
  if (fs.existsSync(p)) {
    errors.push(`Runtime/draft artifact must not exist yet: ${p}`);
  }
}

if (errors.length) {
  console.error("Science master scope verification FAILED:\n");
  for (const e of errors) console.error("  -", e);
  process.exit(1);
}

console.log("Science master scope verification OK");
console.log(`  subject key: ${SCIENCE_SUBJECT_KEY}`);
console.log(`  total Science skills: ${scienceSkills.length}`);
console.log("  in-scope by grade:", SCIENCE_MASTER_SCOPE.inScopeSkillCountsByGrade);
console.log("  proposed page counts:", SCIENCE_MASTER_SCOPE.proposedPageCounts);
